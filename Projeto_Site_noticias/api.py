import pyodbc
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import bcrypt
import jwt
from datetime import datetime, date, timedelta
from typing import Optional

app = FastAPI(title="API de Autenticação no_click_db")

SECRET_KEY = "sua_chave_secreta_super_segura_aqui"
DB_CONN_STR = (
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=127.0.0.1,1433;"
    "DATABASE=no_click_db;"
    "UID=sa;"
    "PWD=Senha123*;"
    "TrustServerCertificate=yes;"
)

# Modelo para o Cadastro (inclui tipo e datas)
class UserRegister(BaseModel):
    username: str
    password: str
    tipo_usuario: str
    data_inicio: date
    data_fim: Optional[date] = None # Pode ser nulo se o acesso for vitalício

# Modelo simples para o Login (só usuário e senha)
class UserLogin(BaseModel):
    username: str
    password: str

def get_db_connection():
    return pyodbc.connect(DB_CONN_STR)

@app.post("/register")
def register(user: UserRegister):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verifica se já existe
    cursor.execute("SELECT id FROM Usuarios WHERE username = ?", user.username)
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Usuário já cadastrado.")
        
    hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt())
    
    # Insere na tabela Usuarios com todas as colunas
    cursor.execute("""
        INSERT INTO Usuarios (username, password_hash, tipo_usuario, data_inicio, data_fim) 
        VALUES (?, ?, ?, ?, ?)
    """, user.username, hashed_password.decode('utf-8'), user.tipo_usuario, user.data_inicio, user.data_fim)
    
    conn.commit()
    conn.close()
    
    return {"message": "Usuário registrado com sucesso!"}

@app.post("/login")
def login(user: UserLogin):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Busca hash da senha e a data de fim do acesso
    cursor.execute("SELECT id, password_hash, tipo_usuario, data_fim FROM Usuarios WHERE username = ?", user.username)
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=401, detail="Usuário ou senha inválidos.")
        
    stored_hash = row.password_hash
    data_fim = row.data_fim
    tipo_usuario = row.tipo_usuario
    
    # Verifica se o acesso já expirou (se houver data_fim cadastrada)
    if data_fim and data_fim < date.today():
        raise HTTPException(status_code=403, detail="Acesso expirado. Contate o administrador.")
    
    if bcrypt.checkpw(user.password.encode('utf-8'), stored_hash.encode('utf-8')):
        payload = {
            "sub": user.username,
            "tipo": tipo_usuario,
            "exp": datetime.utcnow() + timedelta(hours=2)
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
        return {"access_token": token, "token_type": "bearer", "tipo_usuario": tipo_usuario}
    else:
        raise HTTPException(status_code=401, detail="Usuário ou senha inválidos.")