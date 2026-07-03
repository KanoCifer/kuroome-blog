import { describe, it, expect } from 'vitest';
import { useTodoDrawer } from '../useTodoDrawer';

describe('useTodoDrawer', () => {
  it('初始关闭', () => {
    const { isOpen } = useTodoDrawer();
    expect(isOpen.value).toBe(false);
  });

  it('open 打开抽屉', () => {
    const { isOpen, open } = useTodoDrawer();
    open();
    expect(isOpen.value).toBe(true);
  });

  it('close 关闭抽屉', () => {
    const { isOpen, open, close } = useTodoDrawer();
    open();
    close();
    expect(isOpen.value).toBe(false);
  });

  it('toggle 切换状态', () => {
    const { isOpen, toggle } = useTodoDrawer();
    expect(isOpen.value).toBe(false);

    toggle();
    expect(isOpen.value).toBe(true);

    toggle();
    expect(isOpen.value).toBe(false);
  });
});
