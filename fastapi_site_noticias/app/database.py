import os
import pyodbc
from contextlib import contextmanager

def connection_string():
    driver = os.getenv("DB_DRIVER", "ODBC Driver 18 for SQL Server")
    server = os.getenv("DB_SERVER", "127.0.0.1")
    port = os.getenv("DB_PORT", "1433")
    database = os.getenv("DB_NAME", "SiteNoticias")
    username = os.getenv("DB_USER", "")
    password = os.getenv("DB_PASSWORD", "")
    encrypt = os.getenv("DB_ENCRYPT", "yes")
    trust = os.getenv("DB_TRUST_SERVER_CERTIFICATE", "yes")

    if not username or not password:
        raise RuntimeError("Configure DB_USER e DB_PASSWORD no arquivo .env.")

    return (
        f"DRIVER={{{driver}}};SERVER={server},{port};DATABASE={database};"
        f"UID={username};PWD={password};Encrypt={encrypt};"
        f"TrustServerCertificate={trust};Connection Timeout=8;"
    )

@contextmanager
def get_connection():
    conn = pyodbc.connect(connection_string())
    try:
        yield conn
    finally:
        conn.close()
