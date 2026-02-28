-- CreateIndex: speed up listing conversations by project (chatbot_id + started_at)
CREATE INDEX "conversation_chatbot_id_idx" ON "conversation"("chatbot_id");

CREATE INDEX "conversation_chatbot_id_started_at_idx" ON "conversation"("chatbot_id", "started_at");
