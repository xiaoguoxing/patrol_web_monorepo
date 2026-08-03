/**
 * v-auth
 * 按钮权限指令
 */
import type { Directive, DirectiveBinding } from 'vue';
import { getUiAdapter } from '../../adapter';

const auth: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const { value } = binding;
    const currentPageRoles = getUiAdapter().getCurrentPermissions();
    if (value instanceof Array && value.length) {
      const hasPermission = value.every((item) => currentPageRoles.includes(item));
      if (!hasPermission) el.remove();
    } else if (!currentPageRoles.includes(value)) {
      el.remove();
    }
  },
};

export default auth;
