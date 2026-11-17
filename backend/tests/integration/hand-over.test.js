import { describe, it, expect } from 'vitest';
import './dbSetup.js';
import './mailerMock.js';
import { createAuthedUser } from './helpers.js';
import User from '../../src/models/User.js';
import Organization from '../../src/models/Organization.js';
import { handOverWorkspace } from '../../src/utils/organizations.js';

describe('workspace hand over', () => {
  it('gives the workspace to an admin first, then a member, and does nothing for a lone owner', async () => {
    const owner = await createAuthedUser({ email: 'hoowner@vaultrix.test', name: 'Owner' });
    const member = await createAuthedUser({ email: 'homember@vaultrix.test', name: 'Member' });
    const admin = await createAuthedUser({ email: 'hoadmin@vaultrix.test', name: 'Admin' });
    await User.updateOne({ _id: member.user._id }, { $set: { orgId: owner.user.orgId, role: 'member' } });
    await User.updateOne({ _id: admin.user._id }, { $set: { orgId: owner.user.orgId, role: 'admin' } });

    const fresh = await User.findById(owner.user._id);
    expect(await handOverWorkspace(fresh)).toBe(String(admin.user._id));
    expect((await User.findById(admin.user._id)).role).toBe('owner');
    expect((await User.findById(member.user._id)).role).toBe('member');
    expect(String((await Organization.findById(owner.user.orgId)).ownerId)).toBe(String(admin.user._id));

    const lone = await createAuthedUser({ email: 'holone@vaultrix.test', name: 'Lone' });
    expect(await handOverWorkspace(await User.findById(lone.user._id))).toBeNull();
    expect(await handOverWorkspace(await User.findById(member.user._id))).toBeNull();
  });
});
