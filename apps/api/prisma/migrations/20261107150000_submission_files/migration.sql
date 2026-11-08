-- Students can attach uploaded files (stored under `submissions/`) to an assignment submission.
ALTER TABLE "Submission" ADD COLUMN "files" JSONB NOT NULL DEFAULT '[]';
