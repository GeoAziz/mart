"""Advanced Test Runner with Reporting"""
import subprocess
import json
import sys
import os
from datetime import datetime
from pathlib import Path


class TestRunner:
    """Manage test execution and reporting"""
    
    def __init__(self, project_root: str = None):
        self.project_root = project_root or str(Path(__file__).parent.parent)
        self.test_dir = os.path.join(self.project_root, "tests")
        self.reports_dir = os.path.join(self.test_dir, "reports")
        Path(self.reports_dir).mkdir(parents=True, exist_ok=True)
    
    def run_tests(self, test_path: str = None, markers: str = None, parallel: int = 1):
        """Run tests with options"""
        
        cmd = [
            sys.executable, "-m", "pytest",
            test_path or os.path.join(self.test_dir, "test_master.py"),
            "-v",
            "--tb=short",
            "-ra",
        ]
        
        if markers:
            cmd.extend(["-m", markers])
        
        if parallel > 1:
            try:
                cmd.extend(["-n", str(parallel)])
            except:
                print("⚠️ Parallel execution requires pytest-xdist")
        
        # Add report file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = os.path.join(self.reports_dir, f"report_{timestamp}.html")
        cmd.extend(["--html", report_file, "--self-contained-html"])
        
        print(f"🚀 Running: {' '.join(cmd)}")
        result = subprocess.run(cmd)
        
        if result.returncode == 0:
            print(f"✅ Tests passed! Report: {report_file}")
        else:
            print(f"❌ Tests failed!")
        
        return result.returncode
    
    def run_smoke_tests(self):
        """Run smoke tests"""
        return self.run_tests(markers="smoke")
    
    def run_e2e_tests(self):
        """Run E2E tests"""
        return self.run_tests(markers="e2e")
    
    def run_integration_tests(self):
        """Run integration tests"""
        return self.run_tests(markers="integration")


if __name__ == "__main__":
    runner = TestRunner()
    
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        if cmd == "smoke":
            sys.exit(runner.run_smoke_tests())
        elif cmd == "e2e":
            sys.exit(runner.run_e2e_tests())
        elif cmd == "integration":
            sys.exit(runner.run_integration_tests())
        else:
            sys.exit(runner.run_tests(test_path=cmd))
    else:
        sys.exit(runner.run_tests())
