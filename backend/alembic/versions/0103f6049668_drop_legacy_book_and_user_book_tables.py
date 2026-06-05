"""drop legacy book and user_book tables

Revision ID: 0103f6049668
Revises: f816f32028f6
Create Date: 2026-06-05 23:48:48.870063

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0103f6049668'
down_revision: Union[str, Sequence[str], None] = 'f816f32028f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # user_book has FK to book — drop child first
    op.drop_index(op.f('ix_user_book_add_date'), table_name='user_book')
    op.drop_index(op.f('ix_user_book_update_date'), table_name='user_book')
    op.drop_table('user_book')
    op.drop_index(op.f('ix_book_author'), table_name='book')
    op.drop_index(op.f('ix_book_title'), table_name='book')
    op.drop_table('book')


def downgrade() -> None:
    """Downgrade schema."""
    # book must exist before user_book (FK dependency)
    op.create_table('book',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('title', sa.VARCHAR(length=200), autoincrement=False, nullable=False),
    sa.Column('author', sa.VARCHAR(length=60), autoincrement=False, nullable=False),
    sa.Column('bookid', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    sa.Column('cover', sa.VARCHAR(length=200), autoincrement=False, nullable=True),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_book')),
    sa.UniqueConstraint('bookid', name=op.f('uq_book_bookid'), postgresql_include=[], postgresql_nulls_not_distinct=False)
    )
    op.create_index(op.f('ix_book_title'), 'book', ['title'], unique=False)
    op.create_index(op.f('ix_book_author'), 'book', ['author'], unique=False)
    op.create_table('user_book',
    sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('book_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('iscompleted', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.Column('add_date', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.Column('update_date', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['book_id'], ['book.id'], name=op.f('fk_user_book_book_id_book')),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], name=op.f('fk_user_book_user_id_user')),
    sa.PrimaryKeyConstraint('user_id', 'book_id', name=op.f('pk_user_book'))
    )
    op.create_index(op.f('ix_user_book_update_date'), 'user_book', ['update_date'], unique=False)
    op.create_index(op.f('ix_user_book_add_date'), 'user_book', ['add_date'], unique=False)
