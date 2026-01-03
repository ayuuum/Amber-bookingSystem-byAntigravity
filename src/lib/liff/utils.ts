import liff from '@line/liff';

/**
 * LIFF stateから店舗slugを安全に取得する
 * 優先順位:
 * 1. liff.getContext()?.liffState
 * 2. URLクエリの liff.state
 * 3. 上記がすべて取れない場合は 'demo-store'
 * 
 * @returns 店舗slug
 */
export function getStoreSlugFromLiffState(): string {
  // 1. liff.getContext()?.liffState
  try {
    const context = liff.getContext();
    if (context?.liffState) {
      return context.liffState;
    }
  } catch (error) {
    console.warn('Failed to get context from liff.getContext():', error);
  }

  // 2. URLクエリの liff.state
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const state = params.get('liff.state');
    if (state) {
      return state;
    }
  }

  // 3. フォールバック
  return 'demo-store';
}

