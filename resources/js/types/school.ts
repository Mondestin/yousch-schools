export type Cycle =
    | 'prescolaire'
    | 'primaire'
    | 'college'
    | 'lycee_general'
    | 'lycee_technique';

export type StaffRole = 'admin' | 'directeur' | 'secretaire' | 'enseignant';

export type Gender = 'femme' | 'homme';

export type EnrollmentStatus = 'inscrit' | 'transfere' | 'abandonne';

export type AdmissionStatus =
    | 'recue'
    | 'en_etude'
    | 'acceptee'
    | 'refusee'
    | 'inscrit';

export type ReenrollmentStatus =
    | 'demandee'
    | 'en_etude'
    | 'validee'
    | 'refusee';

/** Local document attached to a subject, teacher, pupil or admission dossier. */
export type DossierFile = {
    id: string;
    name: string;
    url: string;
    mime: string;
};

export type PaymentStatus = 'paye' | 'partiel' | 'impaye';

export type AssessmentType = 'devoir' | 'composition' | 'examen';

export type Weekday =
    | 'lundi'
    | 'mardi'
    | 'mercredi'
    | 'jeudi'
    | 'vendredi'
    | 'samedi';

export type TimetableSlot = {
    id: string;
    academicYearId: string;
    classroomId: string;
    weekday: Weekday;
    periodId: string;
    subjectId: string;
    teacherId: string;
    room: string | null;
};

export type TimetablePeriod = {
    id: string;
    startsAt: string;
    endsAt: string;
};

export type SchoolBreak = {
    startsAt: string;
    endsAt: string;
};

export type SchoolHours = {
    startsAt: string;
    endsAt: string;
    recess: SchoolBreak | null;
    lunch: SchoolBreak | null;
};

export type CycleSchedule = {
    cycle: Cycle;
    hours: SchoolHours;
    periods: TimetablePeriod[];
};

export type GuardianRelation =
    | 'pere'
    | 'mere'
    | 'tuteur'
    | 'oncle'
    | 'tante'
    | 'autre';

export type MentionCode =
    | 'insuffisant'
    | 'passable'
    | 'assez_bien'
    | 'bien'
    | 'tres_bien';

export type AcademicYear = {
    id: string;
    label: string;
    startsOn: string;
    endsOn: string;
    isCurrent: boolean;
};

export type Term = {
    id: string;
    academicYearId: string;
    name: string;
    position: 1 | 2 | 3;
    startsOn: string;
    endsOn: string;
};

export type GradeLevel = {
    id: string;
    cycle: Cycle;
    code: string;
    name: string;
    position: number;
};

export type Track = {
    id: string;
    cycle: 'lycee_general' | 'lycee_technique';
    code: string;
    name: string;
};

export type Classroom = {
    id: string;
    academicYearId: string;
    cycle: Cycle;
    gradeLevelId: string;
    trackId: string | null;
    code: string;
    name: string;
    section: string | null;
    capacity: number;
};

export type VenueKind =
    | 'salle'
    | 'laboratoire'
    | 'atelier'
    | 'informatique'
    | 'exterieur';

/** Physical room where a lesson takes place, distinct from the class group. */
export type Venue = {
    id: string;
    name: string;
    kind: VenueKind;
    building: string | null;
    capacity: number;
    available: boolean;
};

export type Student = {
    id: string;
    matricule: string;
    firstName: string;
    lastName: string;
    gender: Gender;
    bornOn: string;
    city: string;
    neighborhood: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    enrolledOn: string;
    photoUrl: string | null;
    files?: DossierFile[];
};

export type Guardian = {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    profession: string;
    gender: Gender | null;
    email: string | null;
    city: string | null;
    neighborhood: string | null;
    address: string | null;
};

export type StudentGuardian = {
    studentId: string;
    guardianId: string;
    relation: GuardianRelation;
};

export type Teacher = {
    id: string;
    code: string;
    firstName: string;
    lastName: string;
    phone: string;
    gender: Gender;
    qualification: string;
    hiredOn: string;
    bornOn: string | null;
    email: string | null;
    address: string | null;
    position: string | null;
    city: string;
    neighborhood: string;
    maritalStatus: string;
    status: 'actif' | 'inactif';
    photoUrl: string | null;
    files?: DossierFile[];
};

export type TeacherAssignment = {
    id: string;
    teacherId: string;
    academicYearId: string;
    classroomId: string;
    subjectId: string;
    trackId: string | null;
};

export type Subject = {
    id: string;
    code: string;
    name: string;
    textbook: string | null;
    coefficient: number | null;
    cycle: Cycle;
    gradeLevelId: string;
    trackId: string | null;
    /** Lesson files lecturers can open (programme, polycopiés, exercices). */
    files?: DossierFile[];
};

export type Enrollment = {
    id: string;
    studentId: string;
    classroomId: string;
    academicYearId: string;
    trackId: string | null;
    status: EnrollmentStatus;
};

/** New-pupil application handled by the secretary before inscription. */
export type AdmissionApplication = {
    id: string;
    academicYearId: string;
    cycle: Cycle;
    classroomId: string;
    trackId: string | null;
    submittedOn: string;
    status: AdmissionStatus;
    firstName: string;
    lastName: string;
    gender: Gender;
    bornOn: string;
    city: string;
    neighborhood: string;
    address: string | null;
    phone: string | null;
    guardianLastName: string;
    guardianFirstName: string;
    guardianPhone: string;
    guardianRelation: GuardianRelation;
    notes: string | null;
    files: DossierFile[];
    studentId: string | null;
};

/** Returning pupil confirming a class for the year. */
export type Reenrollment = {
    id: string;
    academicYearId: string;
    studentId: string;
    previousClass: string;
    classroomId: string;
    trackId: string | null;
    submittedOn: string;
    status: ReenrollmentStatus;
    notes: string | null;
    files: DossierFile[];
};

export type Assessment = {
    id: string;
    type: AssessmentType;
    name: string;
    classroomId: string;
    subjectId: string;
    termId: string;
    heldOn: string;
    heldAt: string;
    /** End of the sitting, used on the timetable. */
    heldUntil: string;
};

export type Grade = {
    id: string;
    enrollmentId: string;
    assessmentId: string;
    subjectId: string;
    score: number;
};

export type PaymentMethod = 'especes' | 'mobile_money' | 'virement';

export type Payment = {
    id: string;
    enrollmentId: string;
    month: string;
    amount: number;
    expectedAmount: number;
    status: PaymentStatus;
    paidOn: string | null;
    method: PaymentMethod | null;
};

export type SubscriptionPlan = 'gold' | 'platinium' | 'titanium';

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled';

export type SubscriptionMethod = 'mobile_money' | 'virement' | 'especes';

/** Receipt for a subscription period, settled or not. */
export type SubscriptionReceipt = {
    id: string;
    reference: string;
    periodLabel: string;
    paidOn: string | null;
    amount: number;
    plan: SubscriptionPlan;
    method: SubscriptionMethod;
    status: PaymentStatus;
};

export type Subscription = {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    seats: number;
    usedSeats: number;
    renewsOn: string;
    monthlyAmount: number;
    receipts: SubscriptionReceipt[];
};

export type SchoolProfile = {
    name: string;
    promoterName: string;
    directorName: string;
    city: string;
    country: string;
    phone: string;
    email: string;
    address: string;
    motto: string;
    currency: 'FCFA';
    logoUrl: string | null;
    /** Combined school stamp and director signature, used on printed documents. */
    stampUrl: string | null;
};

export type FeeTariff = {
    cycle: Cycle;
    monthlyAmount: number;
    /** One-off fee for a student joining the school. */
    enrollmentAmount: number;
    /** One-off fee for a student renewing from the previous year. */
    reEnrollmentAmount: number;
};

export type CycleOption = {
    value: Cycle;
    label: string;
};

export type Mention = {
    code: MentionCode;
    label: string;
    min: number;
    max: number;
};

export type RoleOption = {
    value: StaffRole;
    label: string;
};

export type StaffUser = {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: StaffRole;
    /** Cycles this account may open in the header switcher. */
    cycles: Cycle[];
    /** ISO 8601 timestamp of the last authenticated request, null if never seen. */
    lastSeenAt: string | null;
};

export type AttendanceStatus = 'present' | 'absent' | 'retard' | 'excuse';

export type AttendanceMark = {
    id: string;
    enrollmentId: string;
    date: string;
    status: AttendanceStatus;
    /** Timetable lesson this mark belongs to. */
    slotId: string | null;
    periodId: string | null;
    subjectId: string | null;
    note: string | null;
    documentUrl: string | null;
    documentName: string | null;
};

export type InventoryCondition = 'bon' | 'use' | 'hors_service';

export type InventoryStatus =
    | 'en_service'
    | 'en_stock'
    | 'en_reparation'
    | 'reforme';

export type InventoryItem = {
    id: string;
    reference: string;
    name: string;
    category: string;
    quantity: number;
    /** Reorder threshold: below this the item is flagged as low stock. */
    minQuantity: number;
    unitCost: number;
    condition: InventoryCondition;
    status: InventoryStatus;
    location: string;
    assignee: string;
    supplier: string;
    acquiredOn: string;
    warrantyUntil: string | null;
    notes: string;
};

export type CashKind = 'entree' | 'sortie';

export type CashMovement = {
    id: string;
    date: string;
    kind: CashKind;
    label: string;
    description: string;
    amount: number;
    method: 'especes' | 'mobile_money' | 'virement';
};

export type AnnouncementAudience = 'parents' | 'personnel' | 'eleves' | 'tous';

export type Announcement = {
    id: string;
    title: string;
    body: string;
    audience: AnnouncementAudience;
    publishedOn: string;
    expiresOn: string | null;
};

export type Sanction = {
    id: string;
    studentId: string;
    date: string;
    type: string;
    reason: string;
};

export type SchoolContext = {
    cycle: Cycle;
    annee: string;
    academicYearId: string;
    academicYearLabel: string;
    staffRole: StaffRole;
    rolePreview: boolean;
    allowedCycles: Cycle[];
};

export type CycleYearFilter = {
    cycle: Cycle;
    academicYearId: string;
};

export type SchoolDataset = {
    profile: SchoolProfile;
    subscription: Subscription;
    cycles: CycleOption[];
    fees: FeeTariff[];
    academicYears: AcademicYear[];
    terms: Term[];
    gradeLevels: GradeLevel[];
    tracks: Track[];
    classrooms: Classroom[];
    venues: Venue[];
    schedules: CycleSchedule[];
    students: Student[];
    guardians: Guardian[];
    studentGuardians: StudentGuardian[];
    teachers: Teacher[];
    teacherAssignments: TeacherAssignment[];
    subjects: Subject[];
    enrollments: Enrollment[];
    admissions: AdmissionApplication[];
    reenrollments: Reenrollment[];
    assessments: Assessment[];
    timetableSlots: TimetableSlot[];
    grades: Grade[];
    payments: Payment[];
    attendance: AttendanceMark[];
    inventory: InventoryItem[];
    cashMovements: CashMovement[];
    announcements: Announcement[];
    sanctions: Sanction[];
    mentions: Mention[];
    roles: RoleOption[];
    staffUsers: StaffUser[];
};
