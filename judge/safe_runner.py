import sys
import json
import resource
import importlib.util
import ast

def set_limits(max_memory_mib: int = 256, max_cpu_sec: int = 10):
    mem_bytes: int = max_memory_mib * 1024 * 1024
    resource.setrlimit(resource.RLIMIT_AS, (mem_bytes, mem_bytes))
    resource.setrlimit(resource.RLIMIT_CPU, (max_cpu_sec, max_cpu_sec))

def disable_dangerous_modules():
    banned_modules = ['os', 'subprocess', 'shutil', 'socket', 'requests', 'urllib', 'pathlib']
    for module in banned_modules:
        sys.modules[module] = None

if __name__ == '__main__':
    code_path = sys.argv[1]
    grader_path = sys.argv[2]
    testcases_path = sys.argv[3]
    max_memory_mib = int(sys.argv[4])

    try:
        with open(code_path, 'r', encoding='utf-8') as f:
            code_content = f.read()
        ast.parse(code_content)
    except SyntaxError as error:
        print(json.dumps({
            'status': 'COMPILE_ERROR',
            'error': f'Line {error.lineno}: {error.msg}'
        }))
        sys.exit(0)

    set_limits(max_memory_mib=max_memory_mib)

    try:
        spec_grader = importlib.util.spec_from_file_location('grader', grader_path)
        grader_module = importlib.util.module_from_spec(spec_grader)
        spec_grader.loader.exec_module(grader_module)

        with open(testcases_path, 'r') as file:
            testcases = json.load(file)

        disable_dangerous_modules()

        spec_user = importlib.util.spec_from_file_location('solution', code_path)
        user_module = importlib.util.module_from_spec(spec_user)
        spec_user.loader.exec_module(user_module)

        results = grader_module.evaluate(user_module, testcases)
        print(json.dumps({
            'status': 'SUCCESS',
            'results': results
        }))
    except MemoryError:
        print(json.dumps({
            'status': 'MEMORY_LIMIT_EXCEEDED',
            'results': []
        }))
        sys.exit(1)
    except Exception as exception:
        print(json.dumps({
            'status': 'RUNTIME_ERROR',
            'results': [],
            'error': str(exception)
        }))
        sys.exit(1)
