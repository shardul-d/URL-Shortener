CREATE TABLE users(
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL
)

CREATE TABLE urls(
    short_url VARCHAR(20) PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    original_url TEXT NOT NULL,
    alias VARCHAR (50),
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_owner
    	FOREIGN KEY(owner_id)
    	REFERENCES users(id)
    	ON DELETE CASCADE,

    UNIQUE (owner_id, alias)
)

CREATE TABLE clicks(
    id BIGSERIAL PRIMARY KEY,
    short_url VARCHAR(20) NOT NULL,
    click_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    country_code CHAR(2),

    CONSTRAINT fk_short_url
    	FOREIGN KEY(short_url)
    	REFERENCES urls(short_url)
    	ON DELETE CASCADE
);

CREATE INDEX idx_clicks_on_url ON clicks(short_url, click_time);

CREATE TABLE refresh_tokens (
    jti VARCHAR(255) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    CONSTRAINT fk_user
        FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expire_at ON refresh_tokens(expires_at);