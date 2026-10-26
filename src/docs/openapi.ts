/**
 * תיעוד OpenAPI 3 של כל השרת. מוצג ב־/api-docs (Swagger UI) וב־/api-docs.json.
 * הקובץ docs/openapi.json נוצר מכאן בפקודה: npm run openapi:export
 */

const errorResponse = (description: string, code: string, message: string) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
      example: { error: { code, message } },
    },
  },
});

const r400 = {
  description: 'הנתונים שנשלחו לא תקינים',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
      example: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'הנתונים שנשלחו לא תקינים',
          details: [{ field: 'name', message: 'שם הספר הוא שדה חובה' }],
        },
      },
    },
  },
};
const r401 = errorResponse('לא מחובר, או שהטוקן לא תקין או שפג תוקפו', 'UNAUTHORIZED', 'חסר טוקן התחברות');
const r403 = errorResponse('מחובר, אבל אין הרשאה (נדרש גבאי)', 'FORBIDDEN', 'אין לך הרשאה לבצע פעולה זו');
const r404 = (what: string) => errorResponse(`${what} לא נמצא`, 'NOT_FOUND', `${what} לא נמצא`);

const json = (schema: object, example?: unknown) => ({
  'application/json': { schema, ...(example !== undefined ? { example } : {}) },
});
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const bearer = [{ bearerAuth: [] }];

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'integer', minimum: 1 },
  description: 'מזהה',
};
const pageParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'מספר עמוד' },
  {
    name: 'pageSize',
    in: 'query',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    description: 'כמה רשומות בעמוד',
  },
];

const exampleBook = {
  id: 412,
  name: 'אור הצפון',
  shelf: '194',
  subject: 'מוסר',
  author: 'הסבא מסלבודקה',
  quantity: 3,
  addedAt: null,
  isNew: false,
  createdAt: '2026-10-17T10:00:00.000Z',
  updatedAt: '2026-10-17T10:00:00.000Z',
};
const exampleUser = {
  id: 2,
  fullName: 'יעקב כהן',
  username: 'yaakov',
  role: 'WORSHIPPER',
  createdAt: '2026-10-17T10:00:00.000Z',
};
const exampleFeedback = {
  id: 7,
  type: 'MISPLACED',
  status: 'NEW',
  bookId: 412,
  bookTitle: 'אור הצפון',
  message: 'חיפשתי בכל המדף ולא מצאתי',
  userId: 2,
  createdAt: '2026-10-17T10:00:00.000Z',
  updatedAt: '2026-10-17T10:00:00.000Z',
  user: { id: 2, fullName: 'יעקב כהן', username: 'yaakov' },
  book: { id: 412, name: 'אור הצפון', shelf: '194' },
};

const pagedOf = (item: string) => ({
  type: 'object',
  required: ['items', 'total', 'page', 'pageSize', 'totalPages'],
  properties: {
    items: { type: 'array', items: ref(item) },
    total: { type: 'integer', description: 'כמה רשומות יש בסך הכל' },
    page: { type: 'integer' },
    pageSize: { type: 'integer' },
    totalPages: { type: 'integer' },
  },
});

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'אוצר הספרים – API',
    version: '1.0.0',
    description:
      'שרת למערכת אוצר הספרים של בית הכנסת הגדול, חניכי ישיבת חברון.\n\n' +
      '**איך מתחברים כאן:** הריצו `POST /api/auth/login`, העתיקו את `token` מהתשובה, ' +
      'לחצו על **Authorize** למעלה והדביקו אותו (בלי המילה Bearer).\n\n' +
      '**תפקידים:** `WORSHIPPER` – מתפלל, `GABBAI` – גבאי.\n\n' +
      'כל שגיאה חוזרת במבנה `{ "error": { "code", "message", "details?" } }`.',
  },
  servers: [{ url: '/', description: 'השרת הנוכחי' }],
  tags: [
    { name: 'כללי' },
    { name: 'התחברות' },
    { name: 'ספרים' },
    { name: 'הערות לגבאי' },
    { name: 'משתמשים' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string' },
              details: {},
            },
          },
        },
      },
      Role: { type: 'string', enum: ['WORSHIPPER', 'GABBAI'] },
      User: {
        type: 'object',
        required: ['id', 'fullName', 'username', 'role', 'createdAt'],
        properties: {
          id: { type: 'integer' },
          fullName: { type: 'string' },
          username: { type: 'string' },
          role: ref('Role'),
          createdAt: { type: 'string', format: 'date-time' },
        },
        example: exampleUser,
      },
      AuthResponse: {
        type: 'object',
        required: ['token', 'user'],
        properties: { token: { type: 'string', description: 'JWT לשליחה בכותרת Authorization' }, user: ref('User') },
      },
      RegisterRequest: {
        type: 'object',
        required: ['fullName', 'username', 'password'],
        properties: {
          fullName: { type: 'string', minLength: 2, maxLength: 60, example: 'יעקב כהן' },
          username: {
            type: 'string',
            minLength: 3,
            maxLength: 30,
            pattern: '^[a-z0-9._]+$',
            description: 'אותיות באנגלית, ספרות, נקודה וקו תחתון. אותיות גדולות הופכות לקטנות',
            example: 'yaakov',
          },
          password: { type: 'string', minLength: 6, maxLength: 72, example: 'secret123' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'gabbai' },
          password: { type: 'string', example: 'gabbai1234' },
        },
      },
      Book: {
        type: 'object',
        required: ['id', 'name', 'shelf', 'subject', 'author', 'quantity', 'addedAt', 'isNew', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          shelf: { type: 'string', nullable: true, description: 'מספר מדף כטקסט: "194", "ב 6", "42 א", "80-88"' },
          subject: { type: 'string', nullable: true, description: 'נושא חופשי' },
          author: { type: 'string', nullable: true },
          quantity: { type: 'integer', minimum: 1 },
          addedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'מתי נוסף לאוצר. null בספרים שיובאו מהקטלוג המודפס',
          },
          isNew: { type: 'boolean', description: 'האם נוסף ב־30 הימים האחרונים' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        example: exampleBook,
      },
      BookInput: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200, example: 'שערי יושר' },
          shelf: { type: 'string', nullable: true, maxLength: 30, example: '164' },
          subject: { type: 'string', nullable: true, maxLength: 200, example: 'על הש"ס' },
          author: { type: 'string', nullable: true, maxLength: 120, example: "ר' שמעון שקופ" },
          quantity: { type: 'integer', minimum: 1, maximum: 999, default: 1, example: 2 },
        },
      },
      BookList: pagedOf('Book'),
      FeedbackType: {
        type: 'string',
        enum: ['MISPLACED', 'DAMAGED', 'NEW_BOOK_REQUEST', 'OTHER'],
        description: 'MISPLACED – לא במקום · DAMAGED – פגום · NEW_BOOK_REQUEST – בקשה לספר חדש · OTHER – הערה אחרת',
      },
      FeedbackStatus: {
        type: 'string',
        enum: ['NEW', 'IN_PROGRESS', 'REJECTED'],
        description: 'NEW – חדש · IN_PROGRESS – בטיפול · REJECTED – נדחה. "טופל" = מחיקת ההערה',
      },
      Feedback: {
        type: 'object',
        required: ['id', 'type', 'status', 'bookId', 'bookTitle', 'message', 'userId', 'createdAt', 'updatedAt', 'user', 'book'],
        properties: {
          id: { type: 'integer' },
          type: ref('FeedbackType'),
          status: ref('FeedbackStatus'),
          bookId: { type: 'integer', nullable: true },
          bookTitle: { type: 'string', nullable: true },
          message: { type: 'string', nullable: true },
          userId: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          user: {
            type: 'object',
            properties: { id: { type: 'integer' }, fullName: { type: 'string' }, username: { type: 'string' } },
          },
          book: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              shelf: { type: 'string', nullable: true },
            },
          },
        },
        example: exampleFeedback,
      },
      FeedbackInput: {
        type: 'object',
        required: ['type'],
        description:
          'ב־OTHER: חובה message, ואסור bookId/bookTitle. בשאר הסוגים: חובה bookId (ספר מהקטלוג) או bookTitle (שם חופשי).',
        properties: {
          type: ref('FeedbackType'),
          bookId: { type: 'integer', nullable: true, example: 412 },
          bookTitle: { type: 'string', nullable: true, maxLength: 200 },
          message: { type: 'string', nullable: true, maxLength: 1000, example: 'חיפשתי בכל המדף ולא מצאתי' },
        },
      },
      FeedbackList: pagedOf('Feedback'),
      UserList: pagedOf('User'),
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['כללי'],
        summary: 'בדיקת בריאות השרת ומסד הנתונים',
        responses: {
          200: {
            description: 'השרת ומסד הנתונים תקינים',
            content: json(
              {
                type: 'object',
                properties: { status: { type: 'string' }, database: { type: 'string' }, time: { type: 'string' } },
              },
              { status: 'ok', database: 'ok', time: '2026-10-17T10:00:00.000Z' },
            ),
          },
          503: { description: 'אין חיבור למסד הנתונים' },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['התחברות'],
        summary: 'הרשמת מתפלל חדש (מחזיר טוקן – המתפלל מחובר מיד)',
        requestBody: { required: true, content: json(ref('RegisterRequest')) },
        responses: {
          201: { description: 'נרשם בהצלחה', content: json(ref('AuthResponse')) },
          400: r400,
          409: errorResponse('שם המשתמש תפוס', 'USERNAME_TAKEN', 'שם המשתמש תפוס, נסו שם אחר'),
          429: errorResponse('יותר מדי ניסיונות', 'TOO_MANY_REQUESTS', 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות'),
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['התחברות'],
        summary: 'כניסה – מחזיר טוקן JWT',
        requestBody: { required: true, content: json(ref('LoginRequest')) },
        responses: {
          200: { description: 'נכנס בהצלחה', content: json(ref('AuthResponse')) },
          400: r400,
          401: errorResponse('שם משתמש או סיסמה שגויים', 'UNAUTHORIZED', 'שם משתמש או סיסמה שגויים'),
          429: errorResponse('יותר מדי ניסיונות', 'TOO_MANY_REQUESTS', 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות'),
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['התחברות'],
        summary: 'המשתמש המחובר כרגע',
        security: bearer,
        responses: {
          200: {
            description: 'פרטי המשתמש',
            content: json({ type: 'object', properties: { user: ref('User') } }, { user: exampleUser }),
          },
          401: r401,
        },
      },
    },
    '/api/books': {
      get: {
        tags: ['ספרים'],
        summary: 'חיפוש, סינון ומיון ספרים (פתוח לכולם)',
        description:
          'החיפוש סלחני: מתעלם מגרשיים, ניקוד, אותיות סופיות ומקפים. "רמחל" ימצא "רמח״ל". ' +
          'כמה מילים = כל המילים חייבות להופיע (בשם, בנושא, במחבר או במדף).',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string', maxLength: 100 }, description: 'טקסט חופשי לחיפוש' },
          { name: 'name', in: 'query', schema: { type: 'string', maxLength: 100 }, description: 'חיפוש מתקדם: רק בשם הספר' },
          { name: 'subject', in: 'query', schema: { type: 'string', maxLength: 100 }, description: 'חיפוש מתקדם: רק בנושא' },
          { name: 'author', in: 'query', schema: { type: 'string', maxLength: 100 }, description: 'חיפוש מתקדם: רק במחבר' },
          { name: 'shelf', in: 'query', schema: { type: 'string' }, description: 'מדף מדויק, למשל 194 או "ב 6"' },
          {
            name: 'sort',
            in: 'query',
            schema: { type: 'string', enum: ['name', 'shelf', 'newest'], default: 'name' },
            description: 'name – לפי שם · shelf – לפי מדף · newest – החדשים קודם',
          },
          ...pageParams,
        ],
        responses: {
          200: {
            description: 'רשימת ספרים',
            content: json(ref('BookList'), { items: [exampleBook], total: 1, page: 1, pageSize: 20, totalPages: 1 }),
          },
          400: r400,
        },
      },
      post: {
        tags: ['ספרים'],
        summary: 'הוספת ספר (גבאי). ספר שכבר קיים – הכמות עולה',
        description:
          'ספר נחשב "קיים" כשיש לו אותו שם, אותו מחבר ואותו מדף. במקרה כזה לא נוצר ספר חדש: ' +
          'הכמות שנשלחה מתווספת לכמות הקיימת, והתשובה היא 200 עם merged: true.',
        security: bearer,
        requestBody: { required: true, content: json(ref('BookInput')) },
        responses: {
          201: {
            description: 'נוצר ספר חדש',
            content: json(
              { type: 'object', properties: { book: ref('Book'), merged: { type: 'boolean' } } },
              { book: { ...exampleBook, addedAt: '2026-10-17T10:00:00.000Z', isNew: true }, merged: false },
            ),
          },
          200: {
            description: 'הספר כבר היה קיים – הכמות עלתה',
            content: json(
              { type: 'object', properties: { book: ref('Book'), merged: { type: 'boolean' } } },
              { book: { ...exampleBook, quantity: 5 }, merged: true },
            ),
          },
          400: r400,
          401: r401,
          403: r403,
        },
      },
    },
    '/api/books/new': {
      get: {
        tags: ['ספרים'],
        summary: 'ספרים שנוספו לאחרונה (ברירת מחדל: 30 יום)',
        parameters: [{ name: 'days', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 365 } }],
        responses: {
          200: {
            description: 'הספרים החדשים, החדש ביותר ראשון',
            content: json(
              {
                type: 'object',
                properties: { days: { type: 'integer' }, items: { type: 'array', items: ref('Book') } },
              },
              { days: 30, items: [{ ...exampleBook, addedAt: '2026-10-10T10:00:00.000Z', isNew: true }] },
            ),
          },
          400: r400,
        },
      },
    },
    '/api/books/catalog': {
      get: {
        tags: ['ספרים'],
        summary: 'הקטלוג המלא להדפסה, בלי דפדוף (גבאי)',
        security: bearer,
        parameters: [{ name: 'sort', in: 'query', schema: { type: 'string', enum: ['name', 'shelf'], default: 'name' } }],
        responses: {
          200: {
            description: 'כל הספרים',
            content: json(
              {
                type: 'object',
                properties: { total: { type: 'integer' }, items: { type: 'array', items: ref('Book') } },
              },
              { total: 1, items: [exampleBook] },
            ),
          },
          400: r400,
          401: r401,
          403: r403,
        },
      },
    },
    '/api/books/{id}': {
      parameters: [idParam],
      get: {
        tags: ['ספרים'],
        summary: 'ספר אחד, ואיתו הספרים שעל אותו מדף',
        responses: {
          200: {
            description: 'הספר',
            content: json(
              {
                type: 'object',
                properties: { book: ref('Book'), sameShelf: { type: 'array', items: ref('Book') } },
              },
              { book: exampleBook, sameShelf: [{ ...exampleBook, id: 413, name: 'אור יהל', author: "ר' ליב חסמן", quantity: 1 }] },
            ),
          },
          400: r400,
          404: r404('הספר'),
        },
      },
      put: {
        tags: ['ספרים'],
        summary: 'עריכת ספר (גבאי)',
        security: bearer,
        requestBody: { required: true, content: json(ref('BookInput')) },
        responses: {
          200: { description: 'הספר עודכן', content: json({ type: 'object', properties: { book: ref('Book') } }) },
          400: r400,
          401: r401,
          403: r403,
          404: r404('הספר'),
          409: {
            description: 'אחרי העריכה הספר יהיה זהה לספר אחר',
            content: json(ref('Error'), {
              error: {
                code: 'DUPLICATE_BOOK',
                message: 'כבר קיים ספר עם אותו שם, מחבר ומדף',
                details: { existingBookId: 413 },
              },
            }),
          },
        },
      },
      delete: {
        tags: ['ספרים'],
        summary: 'מחיקת ספר (גבאי). הערות על הספר נשארות',
        security: bearer,
        responses: { 204: { description: 'נמחק' }, 400: r400, 401: r401, 403: r403, 404: r404('הספר') },
      },
    },
    '/api/feedback': {
      post: {
        tags: ['הערות לגבאי'],
        summary: 'שליחת הערה לגבאי (כל משתמש מחובר)',
        description: 'השולח נקבע לפי הטוקן בלבד. שדה userId בגוף הבקשה מתעלם.',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: ref('FeedbackInput'),
              examples: {
                misplaced: { summary: 'ספר לא במקום', value: { type: 'MISPLACED', bookId: 412, message: 'לא נמצא על המדף' } },
                request: { summary: 'בקשה לספר חדש', value: { type: 'NEW_BOOK_REQUEST', bookTitle: 'שערי יושר' } },
                other: { summary: 'הערה אחרת', value: { type: 'OTHER', message: 'כדאי להוסיף עוד ארון לספרי המועדים' } },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'ההערה נשלחה',
            content: json({ type: 'object', properties: { feedback: ref('Feedback') } }, { feedback: exampleFeedback }),
          },
          400: r400,
          401: r401,
          404: r404('הספר שנבחר'),
        },
      },
      get: {
        tags: ['הערות לגבאי'],
        summary: 'כל ההערות, החדשות ראשונות (גבאי)',
        security: bearer,
        parameters: [
          { name: 'status', in: 'query', schema: ref('FeedbackStatus') },
          { name: 'type', in: 'query', schema: ref('FeedbackType') },
          ...pageParams,
        ],
        responses: {
          200: {
            description: 'רשימת הערות',
            content: json(ref('FeedbackList'), { items: [exampleFeedback], total: 1, page: 1, pageSize: 20, totalPages: 1 }),
          },
          400: r400,
          401: r401,
          403: r403,
        },
      },
    },
    '/api/feedback/{id}/status': {
      parameters: [idParam],
      patch: {
        tags: ['הערות לגבאי'],
        summary: 'שינוי סטטוס הערה (גבאי)',
        security: bearer,
        requestBody: {
          required: true,
          content: json(
            { type: 'object', required: ['status'], properties: { status: ref('FeedbackStatus') } },
            { status: 'IN_PROGRESS' },
          ),
        },
        responses: {
          200: { description: 'עודכן', content: json({ type: 'object', properties: { feedback: ref('Feedback') } }) },
          400: r400,
          401: r401,
          403: r403,
          404: r404('ההערה'),
        },
      },
    },
    '/api/feedback/{id}': {
      parameters: [idParam],
      delete: {
        tags: ['הערות לגבאי'],
        summary: '"טופל" – מחיקת ההערה (גבאי)',
        security: bearer,
        responses: { 204: { description: 'נמחקה' }, 400: r400, 401: r401, 403: r403, 404: r404('ההערה') },
      },
    },
    '/api/users': {
      get: {
        tags: ['משתמשים'],
        summary: 'רשימת המשתמשים הרשומים (גבאי)',
        security: bearer,
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'חיפוש בשם מלא או בשם משתמש' },
          { name: 'role', in: 'query', schema: ref('Role') },
          ...pageParams,
        ],
        responses: {
          200: {
            description: 'רשימת משתמשים (בלי סיסמאות)',
            content: json(ref('UserList'), { items: [exampleUser], total: 1, page: 1, pageSize: 20, totalPages: 1 }),
          },
          400: r400,
          401: r401,
          403: r403,
        },
      },
    },
    '/api/users/{id}/role': {
      parameters: [idParam],
      patch: {
        tags: ['משתמשים'],
        summary: 'מינוי לגבאי או הורדה מגבאות (גבאי, לא על עצמו)',
        security: bearer,
        requestBody: {
          required: true,
          content: json({ type: 'object', required: ['role'], properties: { role: ref('Role') } }, { role: 'GABBAI' }),
        },
        responses: {
          200: { description: 'התפקיד עודכן', content: json({ type: 'object', properties: { user: ref('User') } }) },
          400: {
            description: 'נתונים לא תקינים, או ניסיון לשנות את התפקיד של עצמך',
            content: json(ref('Error'), {
              error: { code: 'CANNOT_CHANGE_OWN_ROLE', message: 'אי אפשר לשנות את התפקיד של עצמך' },
            }),
          },
          401: r401,
          403: r403,
          404: r404('המשתמש'),
        },
      },
    },
  },
} as const;
