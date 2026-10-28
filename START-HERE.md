# מתחילים כאן 👋

המדריך הזה מסביר צעד אחר צעד איך מעלים את השרת של **אוצר הספרים** לאינטרנט, גם אם לא עשית את זה אף פעם.

**מה נעשה:**
1. נעלה את הקוד ל־**GitHub** (מקום ששומר קוד).
2. נפתח **מסד נתונים** חינמי ב־**Neon**.
3. נפעיל את השרת ב־**Render** (שירות שמריץ שרתים).
4. נבדוק שהכל עובד.

> ⚠️ **הערה חשובה:** אתרי GitHub, Neon ו־Render משנים את המראה שלהם מדי פעם. שמות הכפתורים כאן נכונים לפי מה שידוע לי, אבל ייתכן שתראי שם קצת שונה. אם כפתור לא נמצא, חפשי כפתור עם משמעות דומה.
>
> כל השירותים כאן חינמיים במסלול הבסיסי, אבל למסלולים חינמיים יש מגבלות (ראי בסוף כל חלק).

---

## חלק א – GitHub

### 1. פתיחת חשבון
1. היכנסי ל־https://github.com
2. לחצי **Sign up** ומלאי אימייל, סיסמה ושם משתמש.
3. אשרי את האימייל.

### 2. יצירת Repository (תיקייה לקוד)
1. אחרי הכניסה, לחצי על **+** בפינה העליונה ← **New repository**.
2. ב־**Repository name** כתבי: `otzar-hasfarim-backend`
3. בחרי **Private** (רק את רואה) או **Public**.
4. **אל** תסמני "Add a README file".
5. לחצי **Create repository**.

### 3. חילוץ קובץ ה־ZIP
1. במחשב, לחצי קליק ימני על `backend-project.zip` ← **חלץ הכל** (Extract All).
2. תיווצר תיקייה `backend-project` ובה הקבצים: `src`, `prisma`, `package.json` וכו'.

### 4. העלאת הקבצים דרך הדפדפן
1. בעמוד ה־Repository החדש, לחצי על הקישור **uploading an existing file**.
2. פתחי את התיקייה `backend-project` במחשב, סמני **את כל מה שבתוכה** (Ctrl+A) וגררי לחלון הדפדפן.
   - חשוב: לגרור את **התוכן** של התיקייה, לא את התיקייה עצמה, כדי ש־`package.json` יהיה בראש ה־Repository.
   - אם יש תיקייה `node_modules` – **אל תעלי אותה**.
   - קבצים שמתחילים בנקודה (`.gitignore`, `.env.example`) לפעמים מוסתרים ב־Windows. כדי לראות אותם: בסייר הקבצים ← **תצוגה** ← סמני **פריטים מוסתרים**.
3. למטה, לחצי **Commit changes**.

### 5. בדיקה שהקבצים עלו
ברשימת הקבצים ב־GitHub צריך לראות בשורה הראשית: `src`, `prisma`, `tests`, `docs`, `package.json`, `render.yaml`, `README.md`.
אם את רואה רק תיקייה אחת בשם `backend-project` – הקבצים עלו רמה אחת עמוק מדי. מחקי ונסי שוב לפי סעיף 4.

---

## חלק ב – מסד נתונים (Neon, PostgreSQL חינמי)

> למה Neon ולא מסד הנתונים של Render? במסלול החינמי של Render, מסד הנתונים נמחק אחרי זמן מוגבל. Neon שומר אותו. אפשר גם להשתמש ב־Supabase – כל PostgreSQL עובד.

### 1. פתיחת חשבון
1. היכנסי ל־https://neon.tech
2. לחצי **Sign up** – הכי פשוט להתחבר עם חשבון ה־GitHub.

### 2. יצירת מסד נתונים
1. צרי פרויקט חדש (**Create project**).
2. שם: `otzar`. אזור (Region): בחרי אירופה (למשל Frankfurt), כי הוא קרוב לישראל.
3. לחצי **Create**.

### 3. קבלת כתובת החיבור (Connection String)
1. בלוח הבקרה של הפרויקט, לחצי **Connect** (או חפשי "Connection string").
2. העתיקי את הכתובת. היא נראית בערך כך:
   ```
   postgresql://user:password@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

### 4. שמירה בטוחה
- הכתובת הזו כוללת **סיסמה**. אל תשימי אותה בקוד, אל תעלי אותה ל־GitHub ואל תשלחי אותה לאף אחד.
- שמרי אותה בצד (למשל בפתק במחשב). נצטרך אותה בחלק ג.

### 5. חיבור השרת למסד הנתונים
החיבור נעשה דרך משתנה הסביבה `DATABASE_URL` ב־Render (חלק ג, שלב 6). את הטבלאות עצמן השרת יוצר לבד בהפעלה הראשונה.

**מגבלות:** המסלול החינמי של Neon מוגבל בנפח ובזמן חישוב, וזה מספיק בהחלט לפרויקט כזה. מסד נתונים שלא היה בשימוש "נרדם", וההתעוררות לוקחת שנייה-שתיים.

---

## חלק ג – Render (הפעלת השרת)

### 1. פתיחת חשבון
1. היכנסי ל־https://render.com
2. לחצי **Get Started** והתחברי עם **GitHub**.

### 2. חיבור GitHub
בפעם הראשונה Render יבקש הרשאה לגשת ל־Repositories שלך. אשרי, ואפשר לבחור רק את `otzar-hasfarim-backend`.

### 3. יצירת Web Service
1. לחצי **New +** ← **Web Service**.
2. בחרי **Build and deploy from a Git repository** (אם מופיעה השאלה).

### 4. בחירת ה־Repository
בחרי את `otzar-hasfarim-backend` ולחצי **Connect**.

### 5. הגדרות Build ו־Start
מלאי בדיוק כך:

| שדה | ערך |
| --- | --- |
| Name | `otzar-hasfarim-api` |
| Region | Frankfurt (EU Central) |
| Branch | `main` |
| Runtime / Language | `Node` |
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `npm run start:render` |
| Instance Type | **Free** |

### 6. משתני סביבה (Environment Variables)
באותו עמוד, באזור **Environment Variables**, לחצי **Add Environment Variable** והוסיפי:

| Key | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` |
| `DATABASE_URL` | כתובת החיבור מ־Neon (חלק ב, שלב 3) |
| `JWT_SECRET` | מחרוזת אקראית ארוכה (לפחות 32 תווים). אפשר ללחוץ על **Generate** אם מופיע |
| `CORS_ORIGINS` | כתובת האתר בריאקט. בינתיים: `http://localhost:5173` |

### 7. Prisma Migrations
אין צורך לעשות כלום. פקודת ההפעלה (`npm run start:render`) מריצה קודם `prisma migrate deploy`, שיוצר את הטבלאות במסד הנתונים, ורק אחר כך מפעילה את השרת.

### 8. Deploy
לחצי **Create Web Service** (או **Deploy**). Render יתחיל לבנות. אפשר לראות את ההתקדמות ב־**Logs**.
ההפעלה הראשונה לוקחת כמה דקות. בסוף צריך להופיע בלוגים:
```
✅ השרת פועל על פורט 10000
```

### 9. בדיקה שהשרת פעיל
למעלה בעמוד מופיעה הכתובת של השרת, בערך `https://otzar-hasfarim-api.onrender.com`. פתחי:
```
https://otzar-hasfarim-api.onrender.com/api/health
```
צריך לראות: `{"status":"ok","database":"ok",...}` 🎉

**דרך חלופית:** אפשר גם ללחוץ **New +** ← **Blueprint** ולבחור את ה־Repository. Render יקרא את הקובץ `render.yaml` וימלא את רוב ההגדרות לבד. תצטרכי רק להדביק את `DATABASE_URL` ו־`CORS_ORIGINS`.

**מגבלות המסלול החינמי:** שרת שלא קיבל בקשות כ־15 דקות "נרדם". הבקשה הראשונה אחרי זה לוקחת עד כדקה, ואחר כך הכל מהיר. זה תקין.
אם המסלול החינמי של Render לא זמין לך, אפשר להשתמש באותן הגדרות ב־**Railway** או ב־**Koyeb**: אותה Build Command, אותה Start Command ואותם משתני סביבה.

---

## יצירת חשבון גבאי וטעינת הקטלוג (פעם אחת)

> **הדרך הקלה (מומלץ):** ב־Render ← Environment, מוסיפים `SEED_GABBAI_FULLNAME`, `SEED_GABBAI_USERNAME` ו־`SEED_GABBAI_PASSWORD` ושומרים. בכל הפעלה השרת יוצר את הגבאי (אם עוד לא קיים) וטוען את הקטלוג (ספרים שכבר קיימים מדולגים). הדרך הידנית שלמטה נשארת כאפשרות.

השרת עולה ריק: אין משתמשים ואין ספרים. מוסיפים אותם מהמחשב שלך, ישירות למסד הנתונים בענן:

1. התקיני **Node.js** (גרסה 22, LTS) מ־https://nodejs.org
2. בתיקייה `backend-project`, העתיקי את `.env.example` לקובץ חדש בשם `.env`.
3. ב־`.env` שני:
   ```
   NODE_ENV=production
   DATABASE_URL="<הכתובת מ־Neon>"
   JWT_SECRET="<כל מחרוזת של 32 תווים ומעלה>"
   SEED_GABBAI_FULLNAME="שם הגבאי"
   SEED_GABBAI_USERNAME=gabbai
   SEED_GABBAI_PASSWORD=<סיסמה חזקה שרק את ואבא שלך יודעים>
   ```
4. פתחי חלון פקודות (PowerShell) בתיקייה והריצי:
   ```
   npm install
   npm run db:seed
   npm run import:catalog
   ```
5. הפקודה הראשונה מתקינה את הספריות, השנייה יוצרת את הגבאי (וספרים לדוגמה), והשלישית טוענת כ־2,200 ספרים מהקטלוג.

---

## חלק ד – בדיקה מלאה דרך Swagger

1. **בריאות:** פתחי `https://<הכתובת שלך>/api/health` – צריך `"status":"ok"`.
2. **Swagger:** פתחי `https://<הכתובת שלך>/api-docs` – יופיע דף עם כל הנתיבים.
3. **התחברות:** פתחי את `POST /api/auth/login` ← **Try it out** ← כתבי:
   ```json
   { "username": "gabbai", "password": "<הסיסמה שבחרת>" }
   ```
   ← **Execute**.
4. **קבלת JWT:** בתשובה (Response body) העתיקי את הערך של `token` (בלי המירכאות).
5. **Authorize:** לחצי למעלה על **Authorize** 🔓, הדביקי את הטוקן ← **Authorize** ← **Close**.
6. **קריאה מוגנת:** פתחי `GET /api/auth/me` ← **Try it out** ← **Execute**. צריך לחזור 200 עם הפרטים שלך.
7. **הוספת ספר:** פתחי `POST /api/books` ← **Try it out**, השאירי את הדוגמה ← **Execute**. צריך לחזור **201**.
8. **שליפה:** פתחי `GET /api/books` ← בשדה `q` כתבי `שערי` ← **Execute**. הספר שהוספת יופיע.

**בדיקת הרשאות:** לחצי **Authorize** ← **Logout**, ונסי שוב את `POST /api/books` – צריך לחזור **401**. אחר כך הירשמי כמתפלל (`POST /api/auth/register`), התחברי עם הטוקן שלו ונסי שוב – צריך לחזור **403**.

---

## חלק ה – פתרון תקלות

| התקלה | מה רואים | הפתרון |
| --- | --- | --- |
| **Build Failed** | ב־Logs של Render: שגיאה בזמן `npm install` או `npm run build` | ודאי ש־`package.json` נמצא בשורש ה־Repository (חלק א, סעיף 5), ושה־Build Command מועתקת בדיוק. אם הרצת `npm install` במחשב, העלי גם את `package-lock.json` שנוצר |
| **DATABASE_URL שגוי** | `Can't reach database server` או `P1001` / `P1000` | העתיקי שוב את הכתובת מ־Neon, בלי רווחים ובלי מירכאות מסביב. ודאי שבסופה מופיע `?sslmode=require` |
| **בעיית Prisma** | `Prisma Client did not initialize` או `P3009` | ב־Render: **Manual Deploy** ← **Clear build cache & deploy**. ב־`P3009` (migration שנכשלה) – מחקי את מסד הנתונים ב־Neon, צרי חדש ועדכני `DATABASE_URL` |
| **JWT_SECRET חסר** | בלוגים: `JWT_SECRET חייב להיות באורך 32 תווים לפחות` | הוסיפי משתנה `JWT_SECRET` עם מחרוזת של 32 תווים ומעלה, ואז **Manual Deploy** |
| **שגיאת CORS** | בדפדפן (F12 ← Console): `blocked by CORS policy` | ב־Render עדכני את `CORS_ORIGINS` לכתובת המדויקת של אתר הריאקט, בלי `/` בסוף. כמה כתובות – מפרידים בפסיק |
| **401** | `UNAUTHORIZED` | לא נשלח טוקן, או שפג תוקפו (שעתיים). התחברי מחדש. ב־Swagger: לחצי שוב על **Authorize** |
| **403** | `FORBIDDEN` | המשתמש מחובר אבל אינו גבאי. התחברי עם משתמש הגבאי |
| **Swagger לא נפתח** | עמוד ריק או 404 | ודאי שהכתובת היא `/api-docs` (עם מקף, בלי `/api` לפני). אם השרת נרדם, חכי דקה ורענני |
| **השרת לא עולה** | הסטטוס נשאר "Deploying" או "Failed" | פתחי **Logs** וחפשי את השורה הראשונה עם ❌. ברוב המקרים חסר משתנה סביבה או ש־`DATABASE_URL` שגוי |
| **הבקשה הראשונה איטית מאוד** | לוקח עד דקה | תקין במסלול החינמי: השרת "התעורר" |
