-- חיפוש מתקדם: את המדף מחפשים לפי shelf המדויק, ולכן העמודה shelfSearch כבר לא נחוצה.
ALTER TABLE "books" DROP COLUMN "shelfSearch";
