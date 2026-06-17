create table mcp_auth_codes (
  code             text        primary key,
  redirect_uri     text        not null,
  code_challenge   text        not null,
  original_state   text,
  client_id        text,
  expires_at       timestamptz not null
);
