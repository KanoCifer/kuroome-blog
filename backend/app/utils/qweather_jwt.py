import time

import jwt
from app.core import get_settings

# Open PEM
private_key = get_settings().JWT_PRIVATE_KEY.replace("\\n", "\n")

payload = {
    "iat": int(time.time()) - 10,
    "exp": int(time.time()) + 86390,  # 24 hours
    "sub": "2CTM8FQW28",
}
headers = {"alg": "EdDSA", "kid": "CKPM9U7FMW"}

# Generate JWT
encoded_jwt = jwt.encode(
    payload, private_key, algorithm="EdDSA", headers=headers
)
print(encoded_jwt)
