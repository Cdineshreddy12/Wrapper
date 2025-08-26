import React from 'react';
import { InvitationManager } from '../components/admin/InvitationManager';

export default function TestInvitationManager() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Test Invitation Manager</h1>
      <InvitationManager orgCode="org_0e3615925db1d" />
    </div>
  );
}
