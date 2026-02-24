from __future__ import annotations

import click

from watchlist.models import User


@click.command()
@click.option("--username", prompt=True, help="The username used to login.")
@click.option(
    "--password",
    prompt=True,
    hide_input=True,
    confirmation_prompt=True,
    help="The password used to login.",
)
def admin(username, password):
    from sqlalchemy import select

    from watchlist.extensions import db

    db.create_all()

    user = db.session.execute(select(User)).scalar()
    if user is not None:
        click.echo("Updating user...")
        user.username = username
        user.set_password(password)
    else:
        click.echo("Creating user...")
        user = User(username=username)
        user.name = "Admin"
        user.set_password(password)
        db.session.add(user)

    db.session.commit()
    click.echo("Done.")
