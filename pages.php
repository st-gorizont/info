<?php
header('Content-Type: application/json');

$db = new SQLite3('pages.db');
$db->exec('CREATE TABLE IF NOT EXISTS pages (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, url TEXT UNIQUE, blocks TEXT)');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $result = $db->query('SELECT title, url, blocks FROM pages');
    $pages = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $row['blocks'] = json_decode($row['blocks'], true);
        $pages[] = $row;
    }
    echo json_encode($pages);
} elseif ($method === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    if (!is_array($data)) $data = [];
    $db->exec('DELETE FROM pages');
    $stmt = $db->prepare('INSERT INTO pages (title, url, blocks) VALUES (:title, :url, :blocks)');
    foreach ($data as $p) {
        $stmt->bindValue(':title', isset($p['title']) ? $p['title'] : '', SQLITE3_TEXT);
        $stmt->bindValue(':url', isset($p['url']) ? $p['url'] : '', SQLITE3_TEXT);
        $stmt->bindValue(':blocks', json_encode(isset($p['blocks']) ? $p['blocks'] : []), SQLITE3_TEXT);
        $stmt->execute();
    }
    echo json_encode(['status' => 'ok']);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>
