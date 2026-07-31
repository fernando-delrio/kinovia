# ERRORES_APRENDIDOS

### 2026-07-17 — [Área: Backend / Dependencias]

**❌ Error:**
El backend no arrancaba: `ImportError: email-validator is not installed`. Los schemas
de auth usan `EmailStr` de Pydantic, que necesita un paquete extra que no está incluido
al instalar `fastapi` a secas.

**✅ Corrección:**
`pip install "pydantic[email]"` dentro del venv y regenerar `requirements.txt`.

**🎓 Concepto aprendido:**
Los "extras" de pip (`paquete[extra]`) instalan dependencias opcionales. `pydantic[email]`
= pydantic + email-validator. Un `requirements.txt` solo es fiable si se genera con
`pip freeze` desde un venv donde la app **arranca de verdad** — congelar antes de verificar
produce un archivo que miente.

### 2026-07-17 — [Área: Entorno / Windows]

**❌ Error:**
El comando `python`/`pip` del sistema apuntaba al virtualenv de OTRO proyecto (el de
Instagram), activado automáticamente por el perfil de PowerShell. Instalar ahí habría
mezclado dependencias de dos proyectos.

**✅ Corrección:**
Crear el venv con el Python real del sistema (`py -3.13 -m venv .venv`) y ejecutar
siempre con la ruta explícita `.venv\Scripts\python.exe`.

**🎓 Concepto aprendido:**
Nunca confiar en qué `python` está activo: comprobar con `(Get-Command python).Source`
o `$env:VIRTUAL_ENV`. La ruta explícita al ejecutable del venv elimina la ambigüedad.
