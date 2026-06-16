const { execSync } = require("child_process");
const path = require("path");

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};

function runStep(name, command) {
  console.log(`\n${colors.bold}${colors.cyan}=== Étape : ${name} ===${colors.reset}`);
  console.log(`Exécution : ${colors.yellow}${command}${colors.reset}\n`);
  try {
    execSync(command, { stdio: "inherit", cwd: path.resolve(__dirname, "..") });
    console.log(`\n${colors.green}✔ ${name} réussi !${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`\n${colors.red}✘ ${name} a échoué.${colors.reset}`);
    return false;
  }
}

function validateAll() {
  const steps = [
    { name: "Analyse statique (ESLint)", command: "npm run lint" },
    { name: "Vérification des types (TypeScript)", command: "npx tsc --noEmit" },
    { name: "Tests unitaires (Jest)", command: "npx jest" },
    { name: "Compilation de production (Next.js Build)", command: "npm run build" }
  ];

  console.log(`${colors.bold}${colors.blue}====================================================`);
  console.log(`  PIPELINE D'AUTO-VALIDATION DU PROJET SANKOFA`);
  console.log(`====================================================${colors.reset}`);

  for (const step of steps) {
    const success = runStep(step.name, step.command);
    if (!success) {
      console.log(`\n${colors.bold}${colors.red}❌ ÉCHEC DE L'AUTO-VALIDATION. Veuillez corriger les erreurs ci-dessus.${colors.reset}\n`);
      process.exit(1);
    }
  }

  console.log(`\n${colors.bold}${colors.green}🎉 TOUTES LES ÉTAPES DE VALIDATION ONT RÉUSSI ! Le code est stable et prêt.${colors.reset}\n`);
}

validateAll();
