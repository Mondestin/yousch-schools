# Portal élève — Auth & JSON responses

Base URL: `{APP_URL}/api/v1`  
Interactive docs: `{APP_URL}/docs/api` · OpenAPI: `{APP_URL}/docs/api.json`

---

## Demo credentials

| | |
|---|---|
| Domain | `palmiers` |
| Élève | `eleve@palmiers.cg` / `password` |
| Parent | `parent@palmiers.cg` / `password` |
| Student id | `st-demo-portal` |
| Bulletin term | `term-2026-1` |

Seed / reset:

```bash
php artisan db:seed --class=PortalDemoSeeder
php artisan db:seed --class=SchoolBulletinsSeeder
```

`SchoolBulletinsSeeder` fills **every class** with a full T1 (devoirs + composition + notes) and **closes** marking windows so staff/portal bulletins work.

Photos: stable Dicebear URLs (`https://api.dicebear.com/9.x/…?seed=…`) — same seed → same image.

Staff preview: `/bulletins/st-demo-portal?trimestre=term-2026-1`  
API: `GET /api/v1/students/st-demo-portal/bulletin?termId=term-2026-1`

The 4-digit login code is sent by e-mail. With `MAIL_MAILER=log`, read it in `storage/logs/laravel.log`.

---

## Authentication

2-step login → Bearer token on every portal request.

### Headers (after login)

```http
Authorization: Bearer {token}
Accept: application/json
Content-Type: application/json
```

No CSRF header needed when using Bearer.

---

### Forgot password — `POST /api/v1/password/forgot`

**Request**

```json
{
  "domain": "palmiers",
  "email": "eleve@palmiers.cg"
}
```

**Response `200`** (always the same, whether the account exists or not)

```json
{
  "message": "Si un compte existe pour cet e-mail, un lien de réinitialisation a été envoyé."
}
```

The e-mail contains a **web link** and a **token** to paste in the mobile app. Token expires in **60 minutes**. Rate limit: 5 / minute / email+IP.

---

### Reset password — `POST /api/v1/password/reset`

**Request**

```json
{
  "domain": "palmiers",
  "email": "eleve@palmiers.cg",
  "token": "…jeton reçu par e-mail…",
  "password": "NouveauMotDePasse1!",
  "passwordConfirmation": "NouveauMotDePasse1!"
}
```

| Field | Required | Notes |
|---|---|---|
| `domain` | yes | School slug |
| `email` | yes | Same e-mail as the forgot request |
| `token` | yes | From the e-mail (panel « Application mobile ») |
| `password` | yes | Must satisfy password rules |
| `passwordConfirmation` | yes | Must match `password` |

**Response `200`**

```json
{
  "message": "Mot de passe mis à jour. Vous pouvez vous connecter."
}
```

All existing Bearer tokens for that user are revoked. Then use the normal login flow.

---

### Step 1 — `POST /api/v1/login`

**Request**

```json
{
  "domain": "palmiers",
  "email": "eleve@palmiers.cg",
  "password": "password",
  "deviceName": "iphone"
}
```

| Field | Required | Notes |
|---|---|---|
| `domain` | yes | School slug (e.g. `palmiers`) |
| `email` | yes | |
| `password` | yes | |
| `deviceName` | no | Label stored on the token (default `mobile`) |

**Response `200`**

```json
{
  "requiresVerification": true,
  "challengeToken": "01JXYZ…",
  "expiresIn": 600,
  "message": "Un code à 4 chiffres a été envoyé à votre adresse e-mail."
}
```

- Code expires in **10 minutes**
- Max **5** wrong code attempts per challenge
- Rate limit: 5 login attempts / minute / email+IP

---

### Step 2 — `POST /api/v1/login/verify`

**Request**

```json
{
  "challengeToken": "01JXYZ…",
  "code": "4821"
}
```

| Field | Required | Notes |
|---|---|---|
| `challengeToken` | yes | From step 1 |
| `code` | yes | Exactly 4 digits |

**Response `200`**

```json
{
  "token": "8|abcdef…",
  "tokenType": "Bearer",
  "abilities": ["portal"],
  "school": {
    "id": "01H…",
    "name": "Complexe Scolaire Les Palmiers",
    "domain": "palmiers",
    "status": "active"
  },
  "user": {
    "id": "8",
    "name": "Awa Demo Élève",
    "email": "eleve@palmiers.cg",
    "phone": "06 000 11 22",
    "role": "eleve",
    "cycles": [],
    "lastSeenAt": "2026-10-11T20:00:00+00:00",
    "blocked": false,
    "blockedAt": null,
    "abilities": ["portal"]
  }
}
```

Use `token` as: `Authorization: Bearer 8|abcdef…`

Roles / abilities:

| Role | Abilities |
|---|---|
| `eleve` | `["portal"]` |
| `parent` | `["portal"]` |
| staff | staff nav keys (not portal) |

---

### Optional — `POST /api/v1/login/resend`

**Request**

```json
{
  "challengeToken": "01JXYZ…"
}
```

**Response `200`**

```json
{
  "requiresVerification": true,
  "challengeToken": "01JNEW…",
  "expiresIn": 600,
  "message": "Un nouveau code à 4 chiffres a été envoyé à votre adresse e-mail."
}
```

Replace any stored `challengeToken` with the new one. Rate limit: 3 / minute.

---

### Logout — `POST /api/v1/logout`

Requires Bearer. Deletes the current token.

**Response `200`**

```json
{
  "message": "Déconnexion réussie."
}
```

---

### Errors (auth)

| Status | When |
|---|---|
| `401` | Missing/invalid Bearer · `{ "message": "Non authentifié." }` |
| `403` | Staff hitting portal · `{ "message": "Accès réservé au portail élève / parent." }` |
| `422` | Validation / bad credentials / wrong code |
| `429` | Rate limited |

---

### Quick curl flow

```bash
# 1) Login
curl -s -X POST "$APP_URL/api/v1/login" \
  -H "Accept: application/json" -H "Content-Type: application/json" \
  -d '{"domain":"palmiers","email":"eleve@palmiers.cg","password":"password"}'

# 2) Verify (code from e-mail / log)
curl -s -X POST "$APP_URL/api/v1/login/verify" \
  -H "Accept: application/json" -H "Content-Type: application/json" \
  -d '{"challengeToken":"…","code":"4821"}'

# 3) Call portal
curl -s "$APP_URL/api/v1/portal/students/st-demo-portal/profile" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer 8|…"
```

---

## Portal endpoints (élève / parent)

| Method | Path | Description |
|---|---|---|
| `GET` | `/portal/me` | User + linked students + theme |
| `GET` | `/portal/students/{id}/profile` | Full profile + identity card + theme |
| `GET` | `/portal/students/{id}/planning` | Timetable (alias: `/timetable`) |
| `GET` | `/portal/students/{id}/notes` | Grades (alias: `/grades`) |
| `GET` | `/portal/students/{id}/presences` | Attendance (alias: `/attendance`) |
| `GET` | `/portal/students/{id}/bulletin?termId=term-2026-1` | Bulletin (needs closed windows + notes) |

Also available: `/payments`, `/receipt`, `/files`, `/sanctions`, `/announcements`, `/planning`.

---

## 1. `GET /api/v1/portal/me`

```json
{
  "data": {
    "id": "8",
    "name": "Awa Demo Élève",
    "email": "eleve@palmiers.cg",
    "phone": "06 000 11 22",
    "role": "eleve",
    "cycles": [],
    "lastSeenAt": null,
    "blocked": false,
    "blockedAt": null,
    "abilities": ["portal"]
  },
  "school": {
    "id": "01H…",
    "name": "Complexe Scolaire Les Palmiers",
    "domain": "palmiers",
    "status": "active"
  },
  "schoolProfile": {
    "name": "Complexe Scolaire Les Palmiers",
    "promoterName": "…",
    "directorName": "…",
    "city": "Brazzaville",
    "country": "Congo",
    "phone": "…",
    "email": "contact@palmiers.cg",
    "address": "…",
    "motto": "…",
    "currency": "FCFA",
    "logoUrl": "/storage/…/logo.png",
    "stampUrl": null,
    "idCardAccent": "#6425d0",
    "idCardBody": "#ffffff"
  },
  "theme": {
    "accent": "#6425d0",
    "body": "#ffffff"
  },
  "students": [
    {
      "id": "st-demo-portal",
      "matricule": "MAT-DEMO-01",
      "firstName": "Awa",
      "lastName": "Demo",
      "gender": "femme",
      "bornOn": "2012-05-14",
      "city": "Brazzaville",
      "neighborhood": "Moungali",
      "address": "Avenue de la Paix",
      "phone": "06 000 11 22",
      "email": "eleve@palmiers.cg",
      "enrolledOn": "2026-10-11",
      "photoUrl": null,
      "previousSchoolName": null,
      "previousAcademicYear": null,
      "previousClass": null,
      "previousSchoolCity": null,
      "isTransfer": false,
      "hasPortalAccount": true,
      "files": [],
      "enrollments": [],
      "guardians": [],
      "theme": { "accent": "#6425d0", "body": "#ffffff" },
      "card": {}
    }
  ],
  "guardian": null
}
```

Parent: `guardian` is an object; `students` lists linked children.

---

## 2. `GET /api/v1/portal/students/{id}/profile`

```json
{
  "data": {
    "id": "st-demo-portal",
    "matricule": "MAT-DEMO-01",
    "firstName": "Awa",
    "lastName": "Demo",
    "gender": "femme",
    "bornOn": "2012-05-14",
    "city": "Brazzaville",
    "neighborhood": "Moungali",
    "address": "Avenue de la Paix",
    "phone": "06 000 11 22",
    "email": "eleve@palmiers.cg",
    "enrolledOn": "2026-10-11",
    "photoUrl": null,
    "previousSchoolName": null,
    "previousAcademicYear": null,
    "previousClass": null,
    "previousSchoolCity": null,
    "isTransfer": false,
    "hasPortalAccount": true,
    "files": [],
    "enrollments": [
      {
        "id": "en-demo-portal",
        "studentId": "st-demo-portal",
        "classroomId": "cr-6eme",
        "academicYearId": "year-2026",
        "trackId": null,
        "status": "inscrit"
      }
    ],
    "guardians": [
      {
        "id": "gu-demo-portal",
        "firstName": "Marie",
        "lastName": "Demo",
        "phone": "06 000 33 44",
        "profession": "Commerçante",
        "gender": "femme",
        "email": "parent@palmiers.cg",
        "city": "Brazzaville",
        "neighborhood": "Moungali",
        "address": "Avenue de la Paix",
        "hasPortalAccount": true,
        "relation": "mere"
      }
    ],
    "theme": {
      "accent": "#6425d0",
      "body": "#ffffff"
    },
    "card": {
      "kind": "student",
      "orientation": "horizontal",
      "theme": {
        "accent": "#6425d0",
        "body": "#ffffff"
      },
      "school": {
        "name": "Complexe Scolaire Les Palmiers",
        "logoUrl": "/storage/…/logo.png",
        "motto": "…",
        "city": "Brazzaville",
        "country": "Congo",
        "phone": "…",
        "email": "contact@palmiers.cg",
        "address": "…"
      },
      "person": {
        "id": "st-demo-portal",
        "name": "Awa Demo",
        "subtitle": "6ème A",
        "photoUrl": null,
        "fields": {
          "matricule": "MAT-DEMO-01",
          "bornOn": "14/05/2012",
          "bornOnIso": "2012-05-14",
          "phone": "06 000 11 22",
          "classroom": "6ème A",
          "gender": "femme",
          "city": "Brazzaville",
          "neighborhood": "Moungali",
          "address": "Avenue de la Paix",
          "email": "eleve@palmiers.cg",
          "enrolledOn": "2026-10-11"
        }
      },
      "classroom": {
        "id": "cr-6eme",
        "academicYearId": "year-2026",
        "cycle": "college",
        "gradeLevelId": "gl-6eme",
        "trackId": null,
        "code": "6A",
        "name": "6ème A",
        "section": "A",
        "capacity": 40
      },
      "enrollment": {
        "id": "en-demo-portal",
        "studentId": "st-demo-portal",
        "classroomId": "cr-6eme",
        "academicYearId": "year-2026",
        "trackId": null,
        "status": "inscrit"
      },
      "identityCard": {
        "id": null,
        "subjectType": "student",
        "subjectId": "st-demo-portal",
        "status": "active",
        "printedAt": null,
        "blockedAt": null,
        "revokedAt": null,
        "revokeReason": null
      }
    }
  },
  "theme": {
    "accent": "#6425d0",
    "body": "#ffffff"
  },
  "schoolProfile": {
    "name": "Complexe Scolaire Les Palmiers",
    "promoterName": "…",
    "directorName": "…",
    "city": "Brazzaville",
    "country": "Congo",
    "phone": "…",
    "email": "contact@palmiers.cg",
    "address": "…",
    "motto": "…",
    "currency": "FCFA",
    "logoUrl": "/storage/…/logo.png",
    "stampUrl": null,
    "idCardAccent": "#6425d0",
    "idCardBody": "#ffffff"
  }
}
```

---

## 3. `GET /api/v1/portal/students/{id}/planning`

Alias: `/timetable`

```json
{
  "data": [
    {
      "id": "ts-…",
      "academicYearId": "year-2026",
      "classroomId": "cr-6eme",
      "weekday": "lundi",
      "periodId": "p1",
      "subjectId": "su-…",
      "teacherId": "te-…",
      "room": "A1",
      "subjectName": "Mathématiques",
      "subjectCode": "MATH",
      "teacherName": "Jean Dupont",
      "classroomName": "6ème A"
    }
  ],
  "classroomId": "cr-6eme",
  "classroom": {
    "id": "cr-6eme",
    "academicYearId": "year-2026",
    "cycle": "college",
    "gradeLevelId": "gl-6eme",
    "trackId": null,
    "code": "6A",
    "name": "6ème A",
    "section": "A",
    "capacity": 40
  }
}
```

Empty: `{ "data": [], "classroomId": null, "classroom": null }`

---

## 4. `GET /api/v1/portal/students/{id}/notes`

Alias: `/grades` · optional `?enrollmentId=en-…`

```json
{
  "data": [
    {
      "id": "gr-…",
      "enrollmentId": "en-demo-portal",
      "assessmentId": "as-…",
      "subjectId": "su-…",
      "score": 14.5,
      "assessmentName": "Devoir 1",
      "assessmentType": "devoir",
      "termId": "term-1",
      "heldOn": "2026-10-01",
      "subjectName": "Mathématiques",
      "subjectCode": "MATH"
    }
  ]
}
```

---

## 5. `GET /api/v1/portal/students/{id}/presences`

Alias: `/attendance` · optional `?date=2026-10-11`

```json
{
  "data": [
    {
      "id": "am-…",
      "enrollmentId": "en-demo-portal",
      "date": "2026-10-11",
      "status": "present",
      "slotId": "ts-…",
      "periodId": "p1",
      "subjectId": "su-…",
      "note": null,
      "documentUrl": null,
      "documentName": null,
      "subjectName": "Mathématiques",
      "subjectCode": "MATH"
    }
  ]
}
```

`status`: `present` | `absent` | `retard` | … (see `AttendanceStatus` enum)
