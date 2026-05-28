# Content OS 🎬

מערכת ניהול תוכן לנעם וספיר.

---

## הגדרה ראשונה (עשה פעם אחת)

### שלב 1: התקן Node.js
הורד מ-https://nodejs.org → לחץ על **LTS** → התקן.

### שלב 2: הגדר Supabase (חינמי)
1. כנס ל-https://supabase.com → **Start for free**
2. צור פרויקט חדש (שמור את הסיסמה)
3. לאחר שהפרויקט עלה → **SQL Editor** (בתפריט שמאל)
4. העתק את כל הקובץ `supabase-schema.sql` והרץ אותו (**RUN**)
5. עבור להגדרות: **Project Settings → API**
6. העתק את:
   - `Project URL`
   - `anon public` key

### שלב 3: הגדר Anthropic API (לכתיבת קופי עם AI)
1. כנס ל-https://console.anthropic.com
2. צור API Key
3. שמור אותו

### שלב 4: הגדר משתני סביבה
1. בתיקיית `content-os`, צור קובץ `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
ANTHROPIC_API_KEY=sk-ant-...
```

### שלב 5: הפעל
```bash
cd content-os
npm install
npm run dev
```
פתח דפדפן: http://localhost:3000

---

## הרצה יומית
```bash
cd content-os
npm run dev
```
פתח http://localhost:3000

---

## שיתוף עם ספיר
כדי שספיר תוכל להיכנס מהטלפון או המחשב שלה:
- **אפשרות א'**: Deploy ל-Vercel (ראה למטה) → תקבל URL קבוע
- **אפשרות ב'**: תריץ locally, ספיר נכנסת מאותה רשת WiFi

### Deploy ל-Vercel (מומלץ)
1. צור חשבון ב-https://vercel.com
2. התקן: `npm install -g vercel`
3. הרץ: `vercel` בתיקיית הפרויקט
4. הוסף את משתני הסביבה ב-Vercel Dashboard

---

## שימוש
- **לוח Kanban**: הזז סרטונים בין שלבים בגרירה
- **כרטיס סרטון**: לחץ על כרטיס לפרטים מלאים
- **קופי + AI**: בכרטיס → לשונית "קופי" → בחר רשת → "כתוב עם AI"
- **צ'קליסט**: בכרטיס → לשונית "צ'קליסט"
- **דשבורד**: סקירה מהירה של מה שעולה היום
- **לוח שנה**: תצוגה חודשית של כל התוכן
- **אנליטיקה**: הזנת נתוני ביצועים אחרי פרסום
