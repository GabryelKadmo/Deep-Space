import { describe, expect, it } from 'vitest';
import { nodeDisplayTitle, processExitCode, processExitLabel } from '$lib/components/agent-room/activity-labels.js';

describe('activity labels', () => {
  it('reads the exit code from the stable action and from legacy items', () => {
    expect(processExitCode('system:process_exited:1')).toBe(1);
    expect(processExitCode('system:process_exited:-1')).toBe(-1);
    expect(processExitCode('PTY exited with code 137')).toBe(137);
    expect(processExitCode('system:task_completed')).toBeNull();
    expect(processExitCode(null)).toBeNull();
  });

  it('names the process when it is known', () => {
    expect(processExitLabel(1, 'Start')).toContain('Start');
    expect(processExitLabel(1, 'Start')).toContain('1');
    expect(processExitLabel(2, '  ')).not.toContain('{name}');
  });

  it('shows the Scripts name for nodes saved with the old default title', () => {
    expect(nodeDisplayTitle('Console')).toBe('Scripts');
    expect(nodeDisplayTitle('Claude')).toBe('Claude');
    expect(nodeDisplayTitle(null)).toBeNull();
  });
});
