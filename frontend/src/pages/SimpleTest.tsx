import React from 'react';
import { InvitationManager } from '../components/admin/InvitationManager';

export default function SimpleTest() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Simple Test - Invitation Manager</h1>
      <p className="mb-4">Testing the InvitationManager component directly...</p>
      
      <InvitationManager orgCode="org_0e3615925db1d" />
    </div>
  );
}
