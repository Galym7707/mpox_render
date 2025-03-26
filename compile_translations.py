from setuptools import setup
from babel.messages.frontend import compile_catalog

setup(
    name='monkeypox_final',
    packages=[],  # Явно указываем пустой список пакетов
    cmdclass={'compile_catalog': compile_catalog}
)