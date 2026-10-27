import 'dotenv/config';
import mongoose from 'mongoose';
import Organization from '../src/models/Organization.js';
import { findEmptyOrganizations, removeOrganizationIfEmpty } from '../src/utils/organizations.js';

const confirmed = process.argv.includes('--yes');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const empty = await findEmptyOrganizations();

  if (empty.length === 0) {
    console.log('No empty organizations found. Nothing to clean up.');
    return;
  }

  console.log(`Found ${empty.length} organization(s) with no users:`);
  empty.forEach((organization) => console.log(`  ${organization._id}  ${organization.name}`));

  if (!confirmed) {
    console.log('\nNothing was deleted. Run again with --yes to delete these organizations and their income streams, accounts and categories:');
    console.log('  npm run cleanup:orgs -- --yes');
    return;
  }

  let removed = 0;
  for (const organization of empty) {
    if (await removeOrganizationIfEmpty(organization._id)) removed += 1;
  }
  const left = await Organization.countDocuments();
  console.log(`\nRemoved ${removed} organization(s). ${left} organization(s) remain.`);
}

run()
  .catch((error) => {
    console.error('Cleanup failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
