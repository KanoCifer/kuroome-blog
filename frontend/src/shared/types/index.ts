export interface LoginForm {
  username: string;
  password: string;
}

export interface Website {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  category: string;
  tags: string[];
  note: string;
}
