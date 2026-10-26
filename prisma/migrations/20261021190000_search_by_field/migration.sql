-- חיפוש לפי שדה: שם, נושא, מחבר או מדף בנפרד.
-- מוסיף עמודה מנורמלת לכל שדה, וממלא אותה גם בספרים שכבר קיימים.

ALTER TABLE "books"
  ADD COLUMN "nameSearch" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "subjectSearch" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "authorSearch" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "shelfSearch" TEXT NOT NULL DEFAULT '';

-- אותו נרמול כמו normalize() ב־src/lib/text.ts:
-- אותיות קטנות, בלי ניקוד, בלי גרשיים, אותיות סופיות לרגילות, סימנים לרווח, רווח אחד.
CREATE OR REPLACE FUNCTION pg_temp.otzar_normalize(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $fn$
  SELECT btrim(
    regexp_replace(
      regexp_replace(
        translate(
          regexp_replace(
            regexp_replace(lower(coalesce(t, '')), '[֑-ׇ]', '', 'g'),
            '["''`´״׳“”‘’]', '', 'g'),
          'ךםןףץ', 'כמנפצ'),
        '[-–—_.,:;()\[\]{}/\\|]+', ' ', 'g'),
      '\s+', ' ', 'g'))
$fn$;

UPDATE "books" SET
  "nameSearch" = pg_temp.otzar_normalize("name"),
  "subjectSearch" = pg_temp.otzar_normalize("subject"),
  "authorSearch" = pg_temp.otzar_normalize("author"),
  "shelfSearch" = btrim(
    pg_temp.otzar_normalize("shelf") || ' ' || replace(pg_temp.otzar_normalize("shelf"), ' ', '')
  );
