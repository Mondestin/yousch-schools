<?php

namespace App\Console\Commands;

use App\Support\School\SchoolProvisioner;
use Illuminate\Console\Command;
use InvalidArgumentException;

class CreateSchoolCommand extends Command
{
    protected $signature = 'school:create
        {name : Nom de l’établissement}
        {domain : Domaine de connexion (slug)}
        {--admin-email= : E-mail du premier administrateur}
        {--admin-name=Administrateur : Nom du premier administrateur}
        {--admin-password=password : Mot de passe initial}';

    protected $description = 'Crée un établissement multi-school avec un administrateur';

    public function handle(SchoolProvisioner $provisioner): int
    {
        $email = $this->option('admin-email');

        if (! is_string($email) || $email === '') {
            $domain = $provisioner->normalizeDomain((string) $this->argument('domain'));
            $email = $domain !== '' ? "contact@{$domain}.local" : 'contact@local.test';
        }

        try {
            ['school' => $school] = $provisioner->create([
                'name' => (string) $this->argument('name'),
                'domain' => (string) $this->argument('domain'),
                'adminName' => (string) $this->option('admin-name'),
                'adminEmail' => $email,
                'adminPassword' => (string) $this->option('admin-password'),
            ]);
        } catch (InvalidArgumentException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info("École créée : {$school->name}");
        $this->line("Connexion : /login/domain/{$school->domain}");

        return self::SUCCESS;
    }
}
