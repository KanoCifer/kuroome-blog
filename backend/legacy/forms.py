from typing import cast

from flask_babel import lazy_gettext as _
from flask_wtf import FlaskForm
from flask_wtf.file import FileAllowed, FileRequired, FileSize
from wtforms import (
    BooleanField,
    FileField,
    HiddenField,
    PasswordField,
    RadioField,
    SelectField,
    StringField,
    SubmitField,
    TextAreaField,
)
from wtforms.validators import (
    DataRequired,
    Email,
    EqualTo,
    Length,
    Optional,
    Regexp,
)


class BookForm(FlaskForm):
    title = StringField(
        cast(str, _("Title")),
        validators=[
            DataRequired(message=cast(str, _("Title cannot be empty"))),
            Length(
                min=1,
                max=100,
                message=cast(str, _("Title length must be between 1 and 100")),
            ),
        ],
    )
    author = StringField(
        cast(str, _("Author")),
        validators=[
            DataRequired(message=cast(str, _("Author cannot be empty"))),
            Length(
                min=1,
                max=60,
                message=cast(str, _("Author length must be between 1 and 60")),
            ),
        ],
    )
    iscompleted = BooleanField(cast(str, _("Completed")))
    submit = SubmitField(cast(str, _("Add")))


class QLoginForm(FlaskForm):
    username = StringField(
        cast(str, _("Username")),
        validators=[
            DataRequired(message=cast(str, _("Username cannot be empty")))
        ],
    )
    password = PasswordField(
        cast(str, _("Password")),
        validators=[
            DataRequired(message=cast(str, _("Password cannot be empty")))
        ],
    )
    remember_me = BooleanField(cast(str, _("Remember Me")))
    submit = SubmitField(cast(str, _("Login")))


# 用户设置表单
class SettingsForm(FlaskForm):
    name = StringField(
        cast(str, _("Name")),
        validators=[
            Length(
                min=1,
                max=20,
                message=cast(str, _("Name length must be between 1 and 20")),
            ),
        ],
    )

    username = StringField(
        cast(str, _("Username")),
        validators=[
            Length(
                min=1,
                max=20,
                message=cast(
                    str, _("Username length must be between 1 and 20")
                ),
            ),
        ],
    )
    email = StringField(
        cast(str, _("Email")),
        validators=[
            Optional(),
            Length(
                min=1,
                max=50,
                message=cast(str, _("Email length must be between 1 and 50")),
            ),
        ],
    )
    mobile = StringField(
        cast(str, _("Mobile")),
        validators=[
            Optional(),
            Length(
                min=1,
                max=15,
                message=cast(
                    str, _("Mobile number length must be between 1 and 15")
                ),
            ),
        ],
    )
    gender = RadioField(
        cast(str, _("Gender")),
        choices=[
            ("Male", cast(str, _("Male"))),
            ("Female", cast(str, _("Female"))),
        ],
        validators=[Optional()],
    )
    password = PasswordField(
        cast(str, _("Password")),
        validators=[
            Optional(),
            Length(
                min=8,
                max=128,
                message=cast(
                    str, _("Password length must be between 8 and 128")
                ),
            ),
            Regexp(
                r"^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$",
                message=cast(
                    str,
                    _(
                        "Password must contain letters, numbers, and special characters, and be at least 8 characters long"
                    ),
                ),
            ),
        ],
    )

    submit = SubmitField(cast(str, _("Save")))


class DeleteForm(FlaskForm):
    submit = SubmitField(cast(str, _("Delete")))


class UploadPhotoForm(FlaskForm):
    """ """

    photo = FileField(
        cast(str, _("Upload Photo")),
        validators=[
            FileRequired(),
            FileAllowed(
                ["jpg", "jpeg", "png", "gif"], cast(str, _("Images only!"))
            ),
            FileSize(
                max_size=5 * 1024 * 1024,
                message=cast(str, _("File size must be less than 5MB")),
            ),
        ],
    )
    submit = SubmitField(cast(str, _("Upload")))


# 注册表单
class SignUpForm(FlaskForm):
    username = StringField(
        cast(str, _("Username")),
        validators=[
            DataRequired(message=cast(str, _("Username cannot be empty")))
        ],
    )
    email = StringField(
        cast(str, _("Email")),
        validators=[
            Email(message=cast(str, _("Please enter a valid email address"))),
            DataRequired(message=cast(str, _("Email cannot be empty"))),
        ],
    )
    email_code = StringField(
        cast(str, _("Email Code")),
        validators=[
            DataRequired(
                message=cast(str, _("Email verification code cannot be empty"))
            ),
        ],
    )
    password = PasswordField(
        cast(str, _("Password")),
        validators=[
            DataRequired(message=cast(str, _("Password cannot be empty"))),
            Length(
                min=8,
                max=128,
                message=cast(
                    str, _("Password length must be between 8 and 128")
                ),
            ),
            Regexp(
                r"^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$",
                message=cast(
                    str,
                    _(
                        "Password must contain letters, numbers, and special characters, and be at least 8 characters long"
                    ),
                ),
            ),
        ],
    )
    confirm_password = PasswordField(
        cast(str, _("Confirm Password")),
        validators=[
            DataRequired(
                message=cast(str, _("Please re-enter your password"))
            ),
            EqualTo(
                "password",
                message=cast(str, _("The two passwords do not match")),
            ),
        ],
    )
    submit = SubmitField(cast(str, _("Sign Up")))


# 导入书籍表单
class ImportBooksForm(FlaskForm):
    weread_cookie = TextAreaField(
        cast(str, _("WeRead Cookie")),
        validators=[
            DataRequired(message=cast(str, _("weread_cookie cannot be empty")))
        ],
        render_kw={
            "rows": 5,
            "cols": 40,
            "placeholder": cast(str, _("Paste your weread_cookie here...")),
        },
    )
    submit = SubmitField(cast(str, _("Import Books")))


class MessageBoardForm(FlaskForm):
    """
    留言板表单
    包含用户名和留言内容字段
    """

    name = StringField(
        cast(str, _("Username")),
        validators=[
            DataRequired(message=cast(str, _("Username cannot be empty"))),
            Length(
                min=1,
                max=20,
                message=cast(
                    str, _("Username length must be between 1 and 20")
                ),
            ),
        ],
    )
    message = TextAreaField(
        cast(str, _("Message")),
        validators=[
            DataRequired(message=cast(str, _("Message cannot be empty"))),
            Length(
                min=1,
                max=500,
                message=cast(
                    str, _("Message length must be between 1 and 500")
                ),
            ),
        ],
        render_kw={
            "rows": 5,
            "cols": 40,
            "placeholder": cast(str, _("Write your message here...")),
        },
    )
    submit = SubmitField(cast(str, _("Submit")))


class PostForm(FlaskForm):
    title = StringField(
        cast(str, _("Title")),
        validators=[
            DataRequired(message=cast(str, _("Title cannot be empty"))),
            Length(
                min=1,
                max=100,
                message=cast(str, _("Title length must be between 1 and 100")),
            ),
        ],
    )
    category = SelectField(
        cast(str, _("Category")),
        coerce=int,
        validators=[
            DataRequired(message=cast(str, _("Please select a category")))
        ],
    )
    body = TextAreaField(
        cast(str, _("Content")),
        validators=[
            DataRequired(message=cast(str, _("Content cannot be empty"))),
            Length(min=1, message=cast(str, _("Content cannot be empty"))),
        ],
    )
    submit = SubmitField(cast(str, _("Submit")))


class CommentForm(FlaskForm):
    author = StringField(
        cast(str, _("Author")),
        validators=[
            DataRequired(message=cast(str, _("Name cannot be empty"))),
            Length(
                min=1,
                max=30,
                message=cast(str, _("Name length must be between 1 and 30")),
            ),
        ],
    )
    email = StringField(
        cast(str, _("Email")),
        validators=[
            Optional(),
            Email(message=cast(str, _("Please enter a valid email address"))),
            Length(
                min=1,
                max=50,
                message=cast(str, _("Email length must be between 1 and 50")),
            ),
        ],
    )
    site = StringField(
        cast(str, _("Website")),
        validators=[
            Optional(),
            Length(
                min=1,
                max=100,
                message=cast(
                    str, _("Website length must be between 1 and 100")
                ),
            ),
        ],
    )
    body = TextAreaField(
        cast(str, _("Comment")),
        validators=[
            DataRequired(message=cast(str, _("Comment cannot be empty"))),
            Length(
                min=1,
                max=500,
                message=cast(
                    str, _("Comment length must be between 1 and 500")
                ),
            ),
        ],
        render_kw={
            "rows": 5,
            "cols": 40,
            "placeholder": cast(str, _("Write your comment here...")),
        },
    )
    submit = SubmitField(cast(str, _("Submit")))


class AdminCommentForm(CommentForm):
    author = HiddenField()
    email = HiddenField()
    site = HiddenField()
