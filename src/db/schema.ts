import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  boolean,
  date,
  timestamp,
} from 'drizzle-orm/pg-core';

// ============ 通用领域 ============

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  color: text('color'),
  total_target: text('total_target'),
  current_progress: text('current_progress'),
  daily_goal_minutes: integer('daily_goal_minutes'),
  tags: text('tags').array(),
  progress_unit: text('progress_unit'),
});

export const records = pgTable('records', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_name: text('project_name').notNull(),
  duration_minutes: integer('duration_minutes'),
  rating: integer('rating'),
  tags: text('tags').array(),
  note: text('note'),
  date: date('date'),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
});

export const smart_views = pgTable('smart_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  tag_filters: text('tag_filters').array(),
});

// ============ 健身领域 ============

export const morning_snapshots = pgTable('morning_snapshots', {
  date: date('date').primaryKey(),
  weight_kg: real('weight_kg'),
  bf_scale_pct: real('bf_scale_pct'),
  waist_cm: real('waist_cm'),
  visceral_fat_score: integer('visceral_fat_score'),
  morning_hr_rest: integer('morning_hr_rest'),
  orthostatic_symptom: integer('orthostatic_symptom'),
  sleep_quality: integer('sleep_quality'),
  muscle_soreness_global: integer('muscle_soreness_global'),
  morning_erection_length_cm: real('morning_erection_length_cm'),
  morning_erection_diameter_cm: real('morning_erection_diameter_cm'),
});

export const training_logs = pgTable('training_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull(),
  session_type: text('session_type'),
  total_duration_min: integer('total_duration_min'),
  exercise_name: text('exercise_name'),
  sets: integer('sets'),
  reps: real('reps'),
  load_kg: real('load_kg'),
  volume_load: integer('volume_load'),
  rpe_last_set: real('rpe_last_set'),
  rpe_trap_rhomboid: integer('rpe_trap_rhomboid'),
  is_bodyweight: boolean('is_bodyweight').default(false),
});

export const cardio_logs = pgTable('cardio_logs', {
  date: date('date').primaryKey(),
  cardio_type: text('cardio_type'),
  duration_min: integer('duration_min'),
  avg_hr: integer('avg_hr'),
  peak_hr: integer('peak_hr'),
  hr_zone_primary: text('hr_zone_primary'),
  distance_km: real('distance_km'),
  perceived_sweat: integer('perceived_sweat'),
});

export const body_signals = pgTable('body_signals', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull(),
  event_time: text('event_time'),
  signal_type: text('signal_type'),
  severity: integer('severity'),
  trigger_context: text('trigger_context'),
  intervention: text('intervention'),
  next_day_impact: integer('next_day_impact'),
});

export const caliper_measurements = pgTable('caliper_measurements', {
  date: date('date').primaryKey(),
  chest_mm: real('chest_mm'),
  abdomen_mm: real('abdomen_mm'),
  thigh_mm: real('thigh_mm'),
  caliper_bodyfat_pct: real('caliper_bodyfat_pct'),
});

export const water_intake = pgTable('water_intake', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull(),
  time: text('time'),
  amount_ml: integer('amount_ml'),
});

export const daily_flags = pgTable('daily_flags', {
  date: date('date').primaryKey(),
  is_carb_cut_day: boolean('is_carb_cut_day').default(false),
});

export const ai_analysis_history = pgTable('ai_analysis_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull(),
  raw_data_summary: text('raw_data_summary'),
  extra_context: text('extra_context'),
  ai_response: text('ai_response'),
  state_summary: text('state_summary'),
  created_at: timestamp('created_at').defaultNow(),
});

// ============ 健身预设 ============

export const exercise_presets = pgTable('exercise_presets', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  body_part: text('body_part'),
  sets: integer('sets'),
  reps: real('reps'),
  load_kg: real('load_kg'),
  is_bodyweight: boolean('is_bodyweight').default(false),
});

export const cardio_presets = pgTable('cardio_presets', {
  id: uuid('id').primaryKey().defaultRandom(),
  cardio_type: text('cardio_type').notNull().unique(),
  duration_min: integer('duration_min'),
  hr_zone_primary: text('hr_zone_primary'),
});

// ============ 配置 ============

export const api_keys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  provider: text('provider').notNull(),
  key: text('key').notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// ============ 番茄时钟 ============

export const pomodoro_sessions = pgTable('pomodoro_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  status: text('status').notNull().default('idle'),
  preset_minutes: integer('preset_minutes'),
  start_time: timestamp('start_time'),
  elapsed_seconds: integer('elapsed_seconds').notNull().default(0),
  actual_minutes: integer('actual_minutes'),
  project_name: text('project_name'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// ============ 用户档案 ============

export const user_profile = pgTable('user_profile', {
  id: uuid('id').defaultRandom().primaryKey(),
  age: integer('age'),
  updated_at: timestamp('updated_at').defaultNow(),
});
