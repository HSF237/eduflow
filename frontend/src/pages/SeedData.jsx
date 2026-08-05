import React from 'react';

export default function SeedData() {
  return (
    <div className="p-8 max-w-xl mx-auto text-center">
      <h1 className="text-2xl font-bold text-slate-800">Self-Hosted Database Active</h1>
      <p className="text-slate-500 mt-2">
        Data seeding and migration are handled directly via backend scripts using Prisma and PostgreSQL.
      </p>
    </div>
  );
}
