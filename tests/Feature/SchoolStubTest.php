<?php

use App\Models\User;
use App\Support\SchoolCatalog;
use Database\Seeders\SchoolPeopleSeeder;
use Database\Seeders\SchoolTaxonomySeeder;
use Illuminate\Http\Request;

test('guests cannot visit school stub pages', function (string $uri) {
    $this->get($uri)->assertRedirect(route('login'));
})->with([
    '/dashboard',
    '/eleves',
    '/eleves/inscription',
    '/eleves/admissions',
    '/eleves/reinscriptions',
    '/eleves/st-8/identite',
    '/eleves/st-8/tuteurs',
    '/eleves/st-8/notes',
    '/eleves/st-8/paiements',
    '/tuteurs',
    '/tuteurs/gd-1',
    '/enseignants',
    '/enseignants/nouveau',
    '/enseignants/tc-4/identite',
    '/enseignants/tc-4/dossier',
    '/enseignants/tc-4/affectations',
    '/matieres',
    '/emploi-du-temps',
    '/evaluations',
    '/evaluations/saisie',
    '/evaluations/controle',
    '/bulletins',
    '/bulletins/st-8',
    '/paiements',
    '/paiements/st-8',
    '/utilisateurs',
    '/structure',
    '/structure/annees',
    '/structure/classes',
    '/structure/series',
    '/structure/horaires',
    '/etablissement/identite',
    '/etablissement/frais',
    '/etablissement/abonnement',
    '/presences',
    '/resultats',
    '/materiel',
    '/caisse',
    '/caisse/frais',
    '/caisse/mouvements',
    '/annonces',
    '/eleves/st-8/documents',
    '/eleves/st-8/discipline',
    '/caisse/frais/st-8/recu/py-5',
]);

test('authenticated staff can visit school stub pages', function (string $uri, string $component) {
    $this->actingAs(User::factory()->create());

    $this->get($uri)
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component($component)
            ->has('catalog.students')
            ->has('catalog.tracks')
            ->has('catalog.gradeLevels'));
})->with([
    ['/dashboard', 'dashboard'],
    ['/eleves', 'students/index'],
    ['/eleves/inscription', 'students/create'],
    ['/eleves/admissions', 'students/admissions'],
    ['/eleves/reinscriptions', 'students/reenrollments'],
    ['/eleves/st-8/identite', 'students/identity'],
    ['/eleves/st-8/tuteurs', 'students/guardians'],
    ['/eleves/st-8/notes', 'students/grades'],
    ['/eleves/st-8/paiements', 'students/payments'],
    ['/tuteurs', 'guardians/index'],
    ['/tuteurs/gd-1', 'guardians/show'],
    ['/enseignants', 'teachers/index'],
    ['/enseignants/nouveau', 'teachers/create'],
    ['/enseignants/tc-4/identite', 'teachers/identity'],
    ['/enseignants/tc-4/dossier', 'teachers/dossier'],
    ['/enseignants/tc-4/affectations', 'teachers/assignments'],
    ['/matieres', 'subjects/index'],
    ['/emploi-du-temps', 'timetable/index'],
    ['/evaluations', 'assessments/index'],
    ['/evaluations/saisie', 'assessments/entry'],
    ['/evaluations/controle', 'assessments/control'],
    ['/bulletins', 'reports/index'],
    ['/bulletins/st-8', 'reports/show'],
    ['/caisse/frais', 'payments/index'],
    ['/caisse/frais/st-8', 'payments/show'],
    ['/utilisateurs', 'staff/index'],
    ['/structure/annees', 'structure/years'],
    ['/structure/classes', 'structure/classes'],
    ['/structure/series', 'structure/tracks'],
    ['/structure/horaires', 'structure/hours'],
    ['/etablissement/identite', 'etablissement/profile'],
    ['/etablissement/frais', 'etablissement/fees'],
    ['/etablissement/abonnement', 'etablissement/subscription'],
    ['/presences', 'attendance/index'],
    ['/resultats', 'results/index'],
    ['/materiel', 'inventory/index'],
    ['/caisse/mouvements', 'cash/index'],
    ['/annonces', 'announcements/index'],
    ['/eleves/st-8/documents', 'students/documents'],
    ['/eleves/st-8/discipline', 'students/discipline'],
    ['/caisse/frais/st-8/recu/py-5', 'payments/receipt'],
]);

test('catalog includes a lycee technique student enrolled in serie F2', function () {
    $catalog = SchoolCatalog::dataset();
    $tracks = collect($catalog['tracks'])->keyBy('id');

    $enrollment = collect($catalog['enrollments'])->first(
        fn (array $row) => is_string($row['trackId']) && ($tracks[$row['trackId']]['code'] ?? null) === 'F2',
    );

    expect($enrollment)->not->toBeNull();

    $student = collect($catalog['students'])->firstWhere('id', $enrollment['studentId']);

    expect($student['matricule'])->toBe('YS-2026-00018')
        ->and($student['lastName'])->toBe('Mensah');
});

test('catalog includes admissions, reenrollments and subject files', function () {
    $catalog = SchoolCatalog::dataset();
    $admissions = collect($catalog['admissions']);
    $reenrollments = collect($catalog['reenrollments']);
    $math = collect($catalog['subjects'])->firstWhere('id', 'su-math-6eme');

    expect($admissions)->not->toBeEmpty()
        ->and($admissions->pluck('status')->all())->toContain('recue', 'en_etude', 'acceptee', 'refusee', 'inscrit')
        ->and($reenrollments)->not->toBeEmpty()
        ->and($reenrollments->pluck('status')->all())->toContain('demandee', 'en_etude', 'validee', 'refusee')
        ->and($math['files'])->not->toBeEmpty();
});

test('african taxonomy is complete in the catalog', function () {
    $levels = collect(SchoolCatalog::dataset()['gradeLevels'])->pluck('code');
    $tracks = collect(SchoolCatalog::dataset()['tracks'])->pluck('code');
    $mentions = collect(SchoolCatalog::dataset()['mentions'])->pluck('label');

    expect($levels)->toContain('P1', 'P2', 'P3', 'CPU', 'CE1', 'CM2', '6ème', '2nde', '1ère', 'Terminale')
        ->and($tracks)->toContain('A2', 'A3', 'A4', 'C', 'D', 'BG', 'E', 'F1', 'F2', 'F4', 'H', 'G1', 'G3')
        ->and($mentions)->toContain('Passable', 'Assez bien', 'Bien', 'Très bien');
});

test('grade scores stay on the african /20 scale', function () {
    $scores = collect(SchoolCatalog::dataset()['grades'])->pluck('score');

    expect($scores->isNotEmpty())->toBeTrue()
        ->and($scores->every(fn (int|float $score) => $score >= 0 && $score <= 20))->toBeTrue();
});

test('staff pages share the default school context', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/eleves')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('schoolContext.cycle', 'primaire')
            ->where('schoolContext.annee', '2026-2027')
            ->where('schoolContext.academicYearId', 'year-2026'));
});

test('school context follows cycle and annee query params', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/eleves?cycle=lycee_technique&annee=2026-2027')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('schoolContext.cycle', 'lycee_technique')
            ->where('schoolContext.annee', '2026-2027')
            ->where('schoolContext.academicYearId', 'year-2026'));
});

test('invalid cycle and year fall back to primaire and the current year', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/eleves?cycle=faculte&annee=2099-2100')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('schoolContext.cycle', 'primaire')
            ->where('schoolContext.annee', '2026-2027')
            ->where('schoolContext.academicYearId', 'year-2026'));
});

test('ascii annee query matches catalog years that use an en dash', function () {
    $request = Request::create('/eleves', 'GET', [
        'cycle' => 'college',
        'annee' => '2025-2026',
    ]);

    expect(SchoolCatalog::context($request))->toMatchArray([
        'cycle' => 'college',
        'annee' => '2025-2026',
        'academicYearId' => 'year-2025',
        'academicYearLabel' => collect(SchoolCatalog::dataset()['academicYears'])->firstWhere('id', 'year-2025')['label'],
    ]);
});

test('dashboard catalog includes kpi sources', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->has('catalog.payments')
            ->has('catalog.assessments')
            ->has('catalog.teachers')
            ->has('catalog.enrollments'));
});

test('september 2026 fixtures include unpaid fees for college and lycee technique', function () {
    $catalog = SchoolCatalog::dataset();
    $enrollments = collect($catalog['enrollments'])->keyBy('id');
    $classrooms = collect($catalog['classrooms'])->keyBy('id');

    $unpaid = collect($catalog['payments'])
        ->filter(fn (array $payment) => $payment['month'] === '2026-09' && $payment['status'] !== 'paye')
        ->map(function (array $payment) use ($enrollments, $classrooms) {
            $classroom = $classrooms[$enrollments[$payment['enrollmentId']]['classroomId']];

            return [
                'cycle' => $classroom['cycle'],
                'remainder' => $payment['expectedAmount'] - $payment['amount'],
            ];
        });

    expect($unpaid->firstWhere('cycle', 'college')['remainder'])->toBe(25000)
        ->and($unpaid->firstWhere('cycle', 'lycee_technique')['remainder'])->toBe(75000)
        ->and($unpaid->firstWhere('cycle', 'primaire'))->toBeNull();
});

test('authenticated staff are redirected from structure root to annees', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/structure')->assertRedirect('/structure/annees');
});

test('authenticated staff are redirected from etablissement root to identite', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/etablissement')->assertRedirect('/etablissement/identite');
});

test('catalog fees cover every african cycle including lycees', function () {
    $fees = collect(SchoolCatalog::dataset()['fees'])->keyBy('cycle');

    expect($fees->keys()->all())->toBe([
        'prescolaire',
        'primaire',
        'college',
        'lycee_general',
        'lycee_technique',
    ])
        ->and($fees['primaire']['monthlyAmount'])->toBe(25000)
        ->and($fees['college']['monthlyAmount'])->toBe(45000)
        ->and($fees['lycee_general']['monthlyAmount'])->toBe(60000)
        ->and($fees['lycee_technique']['monthlyAmount'])->toBe(75000);
});

test('school profile includes promoter director city and logo field', function () {
    $profile = SchoolCatalog::dataset()['profile'];

    expect($profile['name'])->toBe('Complexe Scolaire Les Palmiers')
        ->and($profile['promoterName'])->toBe('Jean-Marc Kouadio')
        ->and($profile['directorName'])->toBe('Aminata Diop')
        ->and($profile['city'])->toBe('Brazzaville')
        ->and($profile['country'])->toBe('République du Congo')
        ->and($profile['phone'])->not->toBeEmpty()
        ->and($profile['email'])->toBe('contact@palmiers.cg')
        ->and($profile)->toHaveKey('logoUrl')
        ->and($profile)->toHaveKey('stampUrl');
});

test('each academic year has three trimestres', function () {
    $catalog = SchoolCatalog::dataset();
    $terms = collect($catalog['terms'])->groupBy('academicYearId');

    foreach ($catalog['academicYears'] as $year) {
        expect($terms[$year['id']])->toHaveCount(3)
            ->and($terms[$year['id']]->pluck('position')->sort()->values()->all())->toBe([1, 2, 3]);
    }
});

test('authenticated staff are redirected from student root to identite', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/eleves/st-8')->assertRedirect('/eleves/st-8/identite');
});

test('unknown student fiche returns 404', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/eleves/inconnu/identite')->assertNotFound();
});

test('student fiche receives the catalog student id', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/eleves/st-8/identite')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('students/identity')
            ->where('studentId', 'st-8'));
});

test('unknown guardian fiche returns 404', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/tuteurs/inconnu')->assertNotFound();
});

test('guardian fiche receives the catalog guardian id', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/tuteurs/gd-1')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('guardians/show')
            ->where('guardianId', 'gd-1'));
});

test('one guardian can be linked to several students', function () {
    $links = collect(SchoolCatalog::dataset()['studentGuardians'])
        ->groupBy('guardianId')
        ->map->count();

    expect($links['gd-1'])->toBeGreaterThan(1)
        ->and($links['gd-3'])->toBeGreaterThan(1);
});

test('unknown teacher fiche returns 404', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->actingAs(User::factory()->create());

    $this->get('/enseignants/inconnu')->assertNotFound();
});

test('teacher base url redirects to identity', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->actingAs(User::factory()->create());

    $this->get('/enseignants/tc-4')->assertRedirect('/enseignants/tc-4/identite');
});

test('teacher fiche receives the catalog teacher id', function () {
    $this->seed(SchoolTaxonomySeeder::class);
    $this->seed(SchoolPeopleSeeder::class);
    $this->actingAs(User::factory()->create());

    $this->get('/enseignants/tc-4/identite')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('teachers/identity')
            ->where('teacherId', 'tc-4')
            ->has('catalog.teacherAssignments'));

    $this->get('/enseignants/tc-4/affectations')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('teachers/assignments')
            ->where('teacherId', 'tc-4'));

    $this->get('/enseignants/tc-4/dossier')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('teachers/dossier')
            ->where('teacherId', 'tc-4'));
});

test('pascal kouassi is assigned to terminale F2', function () {
    $catalog = SchoolCatalog::dataset();
    $tracks = collect($catalog['tracks'])->keyBy('id');
    $classrooms = collect($catalog['classrooms'])->keyBy('id');

    $assignments = collect($catalog['teacherAssignments'])
        ->where('teacherId', 'tc-4')
        ->filter(function (array $row) use ($tracks, $classrooms) {
            $track = $tracks[$row['trackId']] ?? null;
            $classroom = $classrooms[$row['classroomId']] ?? null;

            return ($track['code'] ?? null) === 'F2'
                && ($classroom['name'] ?? '') !== '';
        });

    expect($assignments)->not->toBeEmpty()
        ->and($assignments->pluck('subjectId')->all())->toContain('su-elec-f2', 'su-math-f2');
});

test('timetable covers CE1 and terminale F2', function () {
    $slots = collect(SchoolCatalog::dataset()['timetableSlots']);
    $ce1 = $slots->where('classroomId', 'cr-ce1');
    $f2 = $slots->where('classroomId', 'cr-tle-f2');

    expect($ce1)->not->toBeEmpty()
        ->and($ce1->pluck('subjectId')->unique()->values()->all())->toContain('su-fra-ce1', 'su-math-ce1')
        ->and($f2->pluck('subjectId')->unique()->values()->all())->toContain('su-elec-f2', 'su-math-f2')
        ->and($f2->every(fn (array $row) => $row['teacherId'] === 'tc-4'))->toBeTrue();
});

test('college and lycee subjects carry a coefficient', function () {
    $subjects = collect(SchoolCatalog::dataset()['subjects']);

    expect($subjects->where('cycle', 'college')->every(
        fn (array $subject) => is_int($subject['coefficient']) && $subject['coefficient'] >= 1,
    ))->toBeTrue()
        ->and($subjects->where('cycle', 'lycee_technique')->every(
            fn (array $subject) => is_int($subject['coefficient']) && $subject['coefficient'] >= 1
                && is_string($subject['trackId']),
        ))->toBeTrue();
});

test('unknown bulletin returns 404', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/bulletins/inconnu')->assertNotFound();
});

test('bulletin receives the catalog student id', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/bulletins/st-8?trimestre=term-2026-1')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('reports/show')
            ->where('studentId', 'st-8')
            ->where('termId', 'term-2026-1'));
});

test('koffi mensah has notes for terminale F2 assessments', function () {
    $catalog = SchoolCatalog::dataset();

    $grades = collect($catalog['grades'])->where('enrollmentId', 'en-9');

    expect($grades->pluck('assessmentId')->all())->toContain('as-2', 'as-3')
        ->and($grades->every(fn (array $grade) => $grade['score'] >= 0 && $grade['score'] <= 20))->toBeTrue();
});

test('unknown payment receipt returns 404', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/caisse/frais/inconnu')->assertNotFound();
});

test('payment receipt receives the catalog student id', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/caisse/frais/st-8')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('payments/show')
            ->where('studentId', 'st-8'));
});

test('staff catalog includes african office roles', function () {
    $catalog = SchoolCatalog::dataset();
    $roles = collect($catalog['roles'])->pluck('value');
    $users = collect($catalog['staffUsers'])->pluck('role');

    expect($roles->all())->toBe(['admin', 'directeur', 'secretaire', 'enseignant'])
        ->and($users)->toContain('admin', 'directeur', 'secretaire', 'enseignant')
        ->and(collect($catalog['staffUsers'])->every(fn (array $user) => filled($user['phone'] ?? null)))->toBeTrue();
});

test('staff users are assigned school cycles', function () {
    $catalog = SchoolCatalog::dataset();
    $cycles = collect($catalog['cycles'])->pluck('value');
    $users = collect($catalog['staffUsers']);
    $teacher = $users->firstWhere('role', 'enseignant');

    expect($users->every(function (array $user) use ($cycles) {
        return isset($user['cycles'])
            && $user['cycles'] !== []
            && collect($user['cycles'])->every(fn (string $cycle) => $cycles->contains($cycle));
    }))->toBeTrue()
        ->and($teacher['cycles'])->toBe(['primaire']);
});

test('a staff account cannot open a cycle it is not assigned', function () {
    $this->actingAs(User::factory()->enseignant()->create([
        'email' => 'p.kouassi@palmiers.cg',
        'cycles' => ['primaire'],
    ]));

    $this->get('/eleves?cycle=lycee_technique&annee=2026-2027')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('schoolContext.cycle', 'primaire')
            ->where('schoolContext.allowedCycles', ['primaire']));
});

test('guests can visit the public school site', function () {
    $this->get('/')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('welcome')
            ->has('catalog.profile')
            ->has('catalog.subscription'));
});

test('catalog includes office datasets for a production school desk', function () {
    $catalog = SchoolCatalog::dataset();

    expect($catalog['attendance'])->not->toBeEmpty()
        ->and($catalog['inventory'])->not->toBeEmpty()
        ->and($catalog['cashMovements'])->not->toBeEmpty()
        ->and($catalog['announcements'])->not->toBeEmpty()
        ->and($catalog['sanctions'])->not->toBeEmpty()
        ->and($catalog['subscription']['plan'])->toBe('platinium')
        ->and($catalog['subscription']['receipts'])->not->toBeEmpty();

    $cycleValues = collect($catalog['cycles'])->pluck('value')->sort()->values();
    $scheduleCycles = collect($catalog['schedules'])->pluck('cycle')->sort()->values();
    $college = collect($catalog['schedules'])->firstWhere('cycle', 'college');

    expect($scheduleCycles)->toEqual($cycleValues)
        ->and($college['hours']['startsAt'])->toBe('07:30')
        ->and($college['hours']['endsAt'])->toBe('14:25')
        ->and($college['hours']['recess']['startsAt'])->toBe('10:15')
        ->and($college['hours']['recess']['endsAt'])->toBe('10:35')
        ->and($college['hours']['lunch']['startsAt'])->toBe('12:25')
        ->and($college['hours']['lunch']['endsAt'])->toBe('13:30')
        ->and($college['periods'])->toHaveCount(6);
});

test('attendance marks a timetable slot and excused marks carry a note', function () {
    $catalog = SchoolCatalog::dataset();
    $slots = collect($catalog['timetableSlots'])->keyBy('id');
    $marks = collect($catalog['attendance']);

    expect($marks->every(fn (array $mark) => array_key_exists('slotId', $mark)
        && array_key_exists('periodId', $mark)
        && array_key_exists('subjectId', $mark)
        && array_key_exists('note', $mark)
        && array_key_exists('documentUrl', $mark)
        && array_key_exists('documentName', $mark)))->toBeTrue();

    $linked = $marks->filter(fn (array $mark) => filled($mark['slotId']));
    $excused = $marks->firstWhere('status', 'excuse');

    expect($linked->isNotEmpty())->toBeTrue()
        ->and($linked->every(function (array $mark) use ($slots) {
            $slot = $slots[$mark['slotId']] ?? null;

            return $slot
                && $mark['periodId'] === $slot['periodId']
                && $mark['subjectId'] === $slot['subjectId'];
        }))->toBeTrue()
        ->and($excused['note'])->not->toBeEmpty();
});

test('venues are catalogued as physical rooms for the timetable', function () {
    $catalog = SchoolCatalog::dataset();
    $names = collect($catalog['venues'])->pluck('name');
    $rooms = collect($catalog['timetableSlots'])->pluck('room')->filter()->unique();

    expect($catalog['venues'])->not->toBeEmpty()
        ->and($rooms->every(fn (string $room) => $names->contains($room)))->toBeTrue();
});

test('fee tariffs carry monthly, enrollment and re-enrollment amounts', function () {
    $fees = collect(SchoolCatalog::dataset()['fees']);

    expect($fees)->not->toBeEmpty()
        ->and($fees->every(fn (array $fee) => isset(
            $fee['monthlyAmount'],
            $fee['enrollmentAmount'],
            $fee['reEnrollmentAmount'],
        )))->toBeTrue();
});

test('assessments carry a start and end clock time for the timetable', function () {
    $assessments = collect(SchoolCatalog::dataset()['assessments']);

    expect($assessments->isNotEmpty())->toBeTrue()
        ->and($assessments->every(function (array $row) {
            return (bool) preg_match('/^\d{2}:\d{2}$/', $row['heldAt'] ?? '')
                && (bool) preg_match('/^\d{2}:\d{2}$/', $row['heldUntil'] ?? '')
                && $row['heldUntil'] > $row['heldAt'];
        }))->toBeTrue();
});

test('unknown payment slip returns 404', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/caisse/frais/st-8/recu/inconnu')->assertNotFound();
});

test('payment slip receives student and payment ids', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/caisse/frais/st-8/recu/py-5')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('payments/receipt')
            ->where('studentId', 'st-8')
            ->where('paymentId', 'py-5'));
});

test('announcements target parents students staff and carry an expiry date', function () {
    $catalog = SchoolCatalog::dataset();
    $audiences = collect($catalog['announcements'])->pluck('audience');

    expect($audiences)->toContain('eleves', 'parents', 'personnel', 'tous')
        ->and($catalog['announcements'])->each->toHaveKeys(['expiresOn', 'publishedOn', 'title', 'body']);
});

test('fee postings carry a settlement method when money was received', function () {
    $payments = collect(SchoolCatalog::dataset()['payments']);
    $paid = $payments->filter(fn (array $payment) => $payment['status'] !== 'impaye' && $payment['amount'] > 0);

    expect($payments)->not->toBeEmpty()
        ->and($paid->every(fn (array $payment) => in_array($payment['method'], ['especes', 'mobile_money', 'virement'], true)))->toBeTrue();
});

test('caisse root and old paiement urls redirect into the cash desk', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/caisse')->assertRedirect('/caisse/frais');
    $this->get('/paiements')->assertRedirect('/caisse/frais');
    $this->get('/paiements/st-8')->assertRedirect('/caisse/frais/st-8');
});

test('staff role follows the role query for the administration maquette', function () {
    $this->actingAs(User::factory()->create());

    $this->get('/dashboard?role=enseignant')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('schoolContext.staffRole', 'enseignant')
            ->where('schoolContext.rolePreview', true));
});

test('home page uses the school profile', function () {
    $this->get('/')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('welcome')
            ->where('catalog.profile.name', 'Complexe Scolaire Les Palmiers')
            ->where('catalog.profile.motto', 'Rigueur - Travail - Réussite')
            ->where('catalog.profile.phone', '06 521 12 34 / 05 551 23 45')
            ->where('catalog.profile.email', 'contact@palmiers.cg')
            ->where('catalog.profile.address', 'Quartier Moungali, avenue de la Paix')
            ->where('catalog.profile.city', 'Brazzaville')
            ->where('catalog.profile.country', 'République du Congo'));
});
