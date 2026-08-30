import { NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { normDate, todayStr } from '@/lib/dates';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SYSTEM_PROMPT = `你是一名专业的个人成长教练和健康管理顾问。你的任务是基于用户提供的多维度数据（学习/爱好投入、健身表现、身体指标、长期目标），给出具体、可执行的建议。

## 输出格式（必须严格遵循）
请用 Markdown 格式输出以下三个板块：

### 🔋 精力分配建议
（分析用户当前在学习和爱好上的投入与产出，给出调整建议）

### 🏋️ 训练与恢复平衡
（基于健身数据评估训练状态，给出维持/增负/减载建议）

### 🎯 下周微习惯策略
（针对每个主要项目，给出一个可执行的微习惯建议）`;

function parseNum(s: string | null): number {
  if (!s) return 0;
  const m = String(s).replace(/[^\d.]/g, '');
  const n = parseFloat(m);
  return Number.isFinite(n) ? n : 0;
}

function avg(arr: number[]): number | null {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

function extractSummary(text: string): string {
  const idx = text.indexOf('### 🎯 下周微习惯策略');
  const head = (idx >= 0 ? text.slice(0, idx) : text).trim();
  return head.slice(0, 100);
}

async function getDeepseekKey(): Promise<string | null> {
  if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY;
  const rows = await db.select().from(schema.api_keys).where(eq(schema.api_keys.provider, 'deepseek'));
  return rows[0]?.key ?? null;
}

async function gather(startDate: string, endDate: string) {
  const records = await db
    .select()
    .from(schema.records)
    .where(and(gte(schema.records.date, startDate), lte(schema.records.date, endDate)))
    .orderBy(desc(schema.records.timestamp));

  const morning = await db
    .select()
    .from(schema.morning_snapshots)
    .where(and(gte(schema.morning_snapshots.date, startDate), lte(schema.morning_snapshots.date, endDate)));

  const training = await db
    .select()
    .from(schema.training_logs)
    .where(and(gte(schema.training_logs.date, startDate), lte(schema.training_logs.date, endDate)));

  const cardio = await db
    .select()
    .from(schema.cardio_logs)
    .where(and(gte(schema.cardio_logs.date, startDate), lte(schema.cardio_logs.date, endDate)));

  const signals = await db
    .select()
    .from(schema.body_signals)
    .where(and(gte(schema.body_signals.date, startDate), lte(schema.body_signals.date, endDate)));

  const projects = await db
    .select()
    .from(schema.projects)
    .orderBy(desc(schema.projects.name));

  return { records, morning, training, cardio, signals, projects };
}

type Gathered = Awaited<ReturnType<typeof gather>>;

function buildSummary(g: Gathered) {
  const { records, morning, training, cardio } = g;
  const activeProjects = new Set(records.map((r) => r.project_name)).size;
  const totalDuration = records.reduce((s, r) => s + (r.duration_minutes ?? 0), 0);
  const avgHr = avg(morning.map((m) => m.morning_hr_rest).filter((v): v is number => v != null));
  const avgSleep = avg(morning.map((m) => m.sleep_quality).filter((v): v is number => v != null));

  return {
    recordCount: records.length,
    totalDuration,
    activeProjects,
    trainingCount: training.length,
    cardioCount: cardio.length,
    avgMorningHr: avgHr != null ? Math.round(avgHr) : null,
    avgSleepQuality: avgSleep != null ? Math.round(avgSleep * 10) / 10 : null,
    hasData: records.length > 0 || morning.length > 0 || training.length > 0 || cardio.length > 0,
  };
}

function buildPrompt(
  g: Gathered,
  startDate: string,
  endDate: string,
  extraContext?: string,
  lastSummary?: string | null,
): string {
  const { records, morning, training, cardio, signals, projects } = g;

  // 1. 通用领域（records）
  const projectStats = new Map<string, { duration: number; ratings: number[]; tags: Set<string> }>();
  for (const r of records) {
    const name = r.project_name ?? '未命名';
    const s = projectStats.get(name) ?? { duration: 0, ratings: [] as number[], tags: new Set<string>() };
    s.duration += r.duration_minutes ?? 0;
    if (r.rating != null) s.ratings.push(r.rating);
    for (const t of r.tags ?? []) if (t) s.tags.add(t);
    projectStats.set(name, s);
  }
  const recordsText = Array.from(projectStats.entries()).map(([name, s]) => {
      const ratingAvg = s.ratings.length
        ? (s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length).toFixed(1)
        : '—';
      return `${name}: ${s.duration}分钟, 标签: [${Array.from(s.tags).join(', ')}], 平均评分: ${ratingAvg}/5`;
    })
    .join('\n');

  // 2. 健身领域
  const avgWeight = avg(morning.map((m) => m.weight_kg).filter((v): v is number => v != null));
  const avgWaist = avg(morning.map((m) => m.waist_cm).filter((v): v is number => v != null));
  const avgHr = avg(morning.map((m) => m.morning_hr_rest).filter((v): v is number => v != null));
  const avgSleep = avg(morning.map((m) => m.sleep_quality).filter((v): v is number => v != null));
  const totalVolume = training.reduce((s, t) => s + (t.volume_load ?? 0), 0);
  const totalCardio = cardio.reduce((s, c) => s + (c.duration_min ?? 0), 0);
  const signalList = signals
    .map(
      (s) =>
        `${normDate(s.date)} ${s.signal_type ?? ''}: ${s.trigger_context ?? ''}${s.intervention ? '（干预：' + s.intervention + '）' : ''}`,
    )
    .join('; ');

  const fitnessText = [
    `晨起数据均值: 体重 ${avgWeight != null ? avgWeight.toFixed(1) : '—'}kg, 腰围 ${avgWaist != null ? avgWaist.toFixed(1) : '—'}cm, 静息心率 ${avgHr != null ? avgHr.toFixed(0) : '—'}bpm, 睡眠质量 ${avgSleep != null ? avgSleep.toFixed(1) : '—'}/5`,
    `训练: ${training.length}次, 总容量 ${totalVolume}`,
    `有氧: ${cardio.length}次, 总时长 ${totalCardio}min`,
    signalList ? `异常事件: ${signalList}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  // 3. 项目进度
  const progressText = projects
    .filter((p) => p.total_target && p.current_progress)
    .map((p) => {
      const total = parseNum(p.total_target);
      const current = parseNum(p.current_progress);
      const pct = total > 0 ? Math.round((current / total) * 100) : 0;
      return `${p.name}: ${p.current_progress} / ${p.total_target} (完成率 ${pct}%)`;
    })
    .join('\n');

  const parts: string[] = [`【时间范围】${startDate} ~ ${endDate}`];
  if (recordsText) parts.push(`## 学习/爱好记录\n${recordsText}`);
  if (fitnessText) parts.push(`## 健身数据\n${fitnessText}`);
  if (progressText) parts.push(`## 项目进度\n${progressText}`);
  if (extraContext) parts.push(`## 补充上下文\n${extraContext}`);
  if (lastSummary) parts.push(`【上次分析摘要】${lastSummary}`);
  return parts.join('\n\n');
}

// GET：数据概览（不调用 AI）
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const endDate = url.searchParams.get('endDate') || todayStr();
    const startDate = url.searchParams.get('startDate') || endDate;
    const g = await gather(startDate, endDate);
    return NextResponse.json({ success: true, summary: buildSummary(g) });
  } catch (error) {
    console.error('[ai analyze GET] 失败:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

// POST：AI 分析
export async function POST(request: Request) {
  try {
    const b = await request.json();
    const startDate = String(b.startDate ?? '');
    const endDate = String(b.endDate ?? '');
    const extraContext = b.extraContext ? String(b.extraContext) : undefined;
    if (!startDate || !endDate) {
      return NextResponse.json({ success: false, error: '日期范围必填' }, { status: 400 });
    }

    const g = await gather(startDate, endDate);
    if (g.records.length === 0 && g.morning.length === 0 && g.training.length === 0 && g.cardio.length === 0) {
      return NextResponse.json({ success: false, error: '当前日期范围内无数据，请先记录一些内容' });
    }

    const lastRows = await db
      .select()
      .from(schema.ai_analysis_history)
      .orderBy(desc(schema.ai_analysis_history.created_at));
    const lastSummary = lastRows[0]?.state_summary ?? null;

    const userPrompt = buildPrompt(g, startDate, endDate, extraContext, lastSummary);

    const apiKey = await getDeepseekKey();
    if (!apiKey) {
      return NextResponse.json({ success: false, error: '请先在设置中配置 DeepSeek API Key' });
    }

    let aiResponse: string;
    try {
      const aiRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
        }),
      });
      const aiData = await aiRes.json();
      aiResponse = aiData?.choices?.[0]?.message?.content ?? '';
      if (!aiResponse) {
        throw new Error(aiData?.error?.message || 'empty response');
      }
    } catch (e) {
      console.error('[ai analyze] DeepSeek 调用失败:', e);
      return NextResponse.json({ success: false, error: 'AI 服务暂时不可用，请稍后再试' });
    }

    const stateSummary = extractSummary(aiResponse);

    const inserted = await db
      .insert(schema.ai_analysis_history)
      .values({
        date: endDate,
        raw_data_summary: userPrompt,
        extra_context: extraContext ?? null,
        ai_response: aiResponse,
        state_summary: stateSummary,
      })
      .returning();

    return NextResponse.json({ success: true, analysis: aiResponse, historyId: inserted[0].id });
  } catch (error) {
    console.error('[ai analyze POST] 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
