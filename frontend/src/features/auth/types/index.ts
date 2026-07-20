// 认证表单类型

export interface ProfileForm {
  name?: string;
  username?: string;
  gender?: string;
  email?: string;
  mobile?: string;
  password?: string;
}

export interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirm_password?: string;
  confirmPassword?: string;
  emailCode?: string;
}
