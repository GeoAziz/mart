"""Quick start test execution"""
import subprocess
import sys
import os

os.chdir(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# Install dependencies
print("📦 Installing dependencies...")
subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-r", "tests/requirements.txt"])

# Run tests
test_suite = sys.argv[1] if len(sys.argv) > 1 else "tests/suites/test_checkout.py"
print(f"\n🚀 Running: {test_suite}\n")

result = subprocess.run(
    [sys.executable, "-m", "pytest", test_suite, "-v", "--tb=short", "-s"],
    env={**os.environ, "HEADLESS": "false"}
)

sys.exit(result.returncode)
