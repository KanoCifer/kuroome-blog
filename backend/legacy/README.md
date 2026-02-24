# Legacy Frontend Files

此目录存放旧版前后端混合架构的遗留文件，供参考和迁移使用。

## 包含内容

- `templates/` - Jinja2 HTML 模板
- `static/` - 旧版静态资源 (CSS, JS, 图片)
- `frontend/` - 原模板子目录
- `forms.py` - WTForms 表单定义
- `lorem.py` - Lorem ipsum 生成器

## 迁移说明

### 已完成迁移
- 后端 API 逻辑 → `backend/watchlist/api/`
- 数据模型 → `backend/watchlist/models.py`
- 认证逻辑 → `backend/watchlist/auth.py` (JWT)

### 需要手动迁移到前端
- [ ] 书籍列表页面 → `frontend/src/views/Books.tsx`
- [ ] 添加书籍表单 → `frontend/src/components/AddBookForm.tsx`
- [ ] 用户登录页面 → `frontend/src/views/Login.tsx`
- [ ] 注册页面 → `frontend/src/views/Register.tsx`
- [ ] 搜索功能 → `frontend/src/components/SearchBar.tsx`

### 静态资源
- `legacy/static/images/` → `frontend/public/`
- `legacy/static/css/main.css` → 参考样式，但使用 Tailwind 重写
- `legacy/static/js/main.js` → 逻辑迁移到 React hooks/components

## 保留目的

1. **参考旧 UI**: 查看旧版页面结构和样式
2. **数据迁移**: 确认旧数据处理逻辑
3. **功能对照**: 确保新实现覆盖所有旧功能
4. **回滚备份**: 紧急情况可快速恢复旧版本

## 何时删除

当所有功能完全迁移并测试通过后，此目录可删除。