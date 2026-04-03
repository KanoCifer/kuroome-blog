from app.utils.qweather_jwt import generate_qweather_jwt


def test_qweather_jwt():
    encoded_jwt = generate_qweather_jwt()
    assert isinstance(encoded_jwt, str)
    assert len(encoded_jwt) > 0
    print("Generated JWT:", encoded_jwt)


if __name__ == "__main__":
    test_qweather_jwt()
