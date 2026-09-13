-- Issue 0018: which call of the step this row is — 1 for the first, 2 for the
-- correction retry. Existing rows predate the retry, so they are all attempt 1.
ALTER TABLE "ai_call" ADD COLUMN "attempt" INTEGER NOT NULL DEFAULT 1;
