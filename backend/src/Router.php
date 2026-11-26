<?php
declare(strict_types=1);

final class Router
{
    /** @var array<int, array{method:string, pattern:string, keys:array, handler:callable}> */
    private array $routes = [];

    public function add(string $method, string $pattern, callable $handler): void
    {
        $keys = [];
        $regex = preg_replace_callback('#\{([a-zA-Z_][a-zA-Z0-9_]*)\}#', function ($m) use (&$keys) {
            $keys[] = $m[1];
            return '([^/]+)';
        }, $pattern);
        $regex = '#^' . $regex . '$#';
        $this->routes[] = [
            'method' => strtoupper($method),
            'pattern' => $regex,
            'keys' => $keys,
            'handler' => $handler,
        ];
    }

    public function dispatch(string $method, string $path): void
    {
        $method = strtoupper($method);
        if ($method === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) continue;
            if (preg_match($route['pattern'], $path, $matches)) {
                array_shift($matches);
                $params = [];
                foreach ($route['keys'] as $i => $key) {
                    $params[$key] = urldecode($matches[$i] ?? '');
                }
                ($route['handler'])($params);
                return;
            }
        }
        Response::error('Not Found', 404);
    }
}
