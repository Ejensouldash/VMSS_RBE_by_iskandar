import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory mock storage
const store: Record<string, string> = {};
global.localStorage = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, value: string) => { store[key] = value.toString(); },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k in store) delete store[k]; },
  key: (index: number) => Object.keys(store)[index] || null,
  length: 0,
};

import { getMachines, updateMachineStatus, getUsers, saveUser } from '../services/db';

describe('Database Service Async Signatures & State Resilience', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getMachines returns a Promise that resolves to an array', async () => {
    const machines = await getMachines();
    expect(Array.isArray(machines)).toBe(true);
    expect(machines.length).toBeGreaterThan(0);
  });

  it('updateMachineStatus properly awaits getMachines and updates status without throwing', async () => {
    const machines = await getMachines();
    const target = machines[0];
    expect(target).toBeDefined();

    const updated = await updateMachineStatus(target.id, { status: 'ONLINE', temp: 4, signal: 5 });
    expect(Array.isArray(updated)).toBe(true);
    const found = updated.find(m => m.id === target.id);
    expect(found?.status).toBe('ONLINE');
    expect(found?.temp).toBe(4);
  });

  it('getUsers returns a Promise that resolves to an array', async () => {
    const users = await getUsers();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
  });

  it('saveUser is an async function that returns a Promise resolving to true', async () => {
    const users = await getUsers();
    const existing = users[0];

    const promise = saveUser({
      ...existing,
      name: 'Updated Name Admin',
      isActive: true,
      status: 'active',
      email: existing.email || 'admin@vmms.local'
    });

    expect(promise).toBeInstanceOf(Promise);
    const result = await promise;
    expect(result).toBe(true);
  });

  it('saveUser handles inserting new users without crashing', async () => {
    const result = await saveUser({
      id: '',
      username: 'tech_new_01',
      name: 'Ahmad Technician',
      role: 'technician',
      email: 'ahmad@vmms.local',
      isActive: true,
      status: 'active'
    });

    expect(result).toBe(true);
  });
});
