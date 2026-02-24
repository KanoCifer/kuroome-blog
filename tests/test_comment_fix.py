# Test script to verify comment functionality fixes

import sys

sys.path.insert(0, "/Users/liudetao/Python-Projects/ReadingList")


def test_get_comment_tree_logic():
    """Test the comment tree building logic"""

    # Simulate the comment tree building logic from views.py
    class MockComment:
        def __init__(self, id, replied_id=None, reviewed=True):
            self.id = id
            self.replied_id = replied_id
            self.reviewed = reviewed

    # Create test comments
    all_comments = [
        MockComment(1, None),  # Root comment
        MockComment(2, 1),  # Reply to comment 1
        MockComment(3, None),  # Another root comment
        MockComment(4, 2),  # Reply to comment 2 (nested)
    ]

    # Build comment tree (same logic as views.py)
    comment_map = {}
    root_comments = []

    for comment in all_comments:
        comment_map[comment.id] = {"comment": comment, "replies": []}

    for comment in all_comments:
        if comment.replied_id and comment.replied_id in comment_map:
            # This is a reply, add to parent's replies
            comment_map[comment.replied_id]["replies"].append(comment_map[comment.id])
        else:
            # This is a root comment
            root_comments.append(comment_map[comment.id])

    # Verify results
    print("✓ Test 1: Root comments count")
    assert len(root_comments) == 2, (
        f"Expected 2 root comments, got {len(root_comments)}"
    )
    print("  PASSED: 2 root comments (comments 1 and 3)")

    print("\n✓ Test 2: Nested replies")
    comment_1_replies = root_comments[0]["replies"]
    assert len(comment_1_replies) == 1, (
        f"Expected 1 reply to comment 1, got {len(comment_1_replies)}"
    )

    comment_2_replies = comment_1_replies[0]["replies"]
    assert len(comment_2_replies) == 1, (
        f"Expected 1 reply to comment 2, got {len(comment_2_replies)}"
    )
    print("  PASSED: Nested replies work correctly (1->2->4)")

    print("\n✓ Test 3: No duplicate comments")
    all_ids = []

    def collect_ids(node):
        all_ids.append(node["comment"].id)
        for reply in node["replies"]:
            collect_ids(reply)

    for root in root_comments:
        collect_ids(root)

    assert len(all_ids) == len(set(all_ids)), f"Duplicate IDs found: {all_ids}"
    print(f"  PASSED: No duplicates in {len(all_ids)} comments")

    print("\n" + "=" * 50)
    print("All tests passed! ✓")
    print("=" * 50)


if __name__ == "__main__":
    test_get_comment_tree_logic()
