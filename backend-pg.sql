CREATE TABLE IF NOT EXISTS suggestions (
    id TEXT PRIMARY KEY NOT NULL, -- s_abc45
    context TEXT NOT NULL,
    author TEXT NOT NULL,
    avatar TEXT NOT NULL,
    guild TEXT NOT NULL,
    channel TEXT NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    upvotes TEXT NOT NULL,
    downvotes TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL
)

CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY NOT NULL, -- r_abc45
    context TEXT NOT NULL,
    author TEXT NOT NULL,
    avatar TEXT NOT NULL,
    guild TEXT NOT NULL,
    channel TEXT NOT NULL,
    message TEXT NOT NULL,
    status INT NOT NULL,
    timestamp TIMESTAMP NOT NULL
)