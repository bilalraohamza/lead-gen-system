import api from "./client"

export const getLeads = (params = {}) =>
  api.get("/leads/", { params })

export const getStats = () =>
  api.get("/leads/stats")

export const getCategories = () =>
  api.get("/leads/categories")

export const getLead = (id) =>
  api.get(`/leads/${id}`)

export const updateStatus = (id, status) =>
  api.patch(`/leads/${id}/status`, null, { params: { status } })

export const generateOutreach = (id) =>
  api.post(`/outreach/${id}/generate`)

export const getSavedMessage = (id) =>
  api.get(`/outreach/${id}/message`)

export const markSent = (id) =>
  api.patch(`/outreach/${id}/mark-sent`)

export const runPipeline = () =>
  api.post("/run-pipeline")

export const getPipelineStatus = () =>
  api.get("/pipeline/status")

export const triggerDailySummary = () =>
  api.post("/leads/notify/daily")

// Settings API
export const getSettings = () =>
  api.get("/settings/")

export const updateCategories = (items) =>
  api.post("/settings/categories", { items })

export const updateSubreddits = (items) =>
  api.post("/settings/subreddits", { items })

export const updateIncludeKeywords = (items) =>
  api.post("/settings/keywords/include", { items })

export const updateBlacklistKeywords = (items) =>
  api.post("/settings/keywords/blacklist", { items })

export const updateCustomUrls = (items) =>
  api.post("/settings/urls", { items })

export const updateAlertScore = (value) =>
  api.post("/settings/alert-score", { value })

export const updateSenderName = (value) =>
  api.post("/settings/sender-name", { value })

export const updateSenderServices = (value) =>
  api.post("/settings/sender-services", { value })

export const updateStrictPrefilter = (value) =>
  api.post("/settings/strict-prefilter", { value })

export const resetSettings = () =>
  api.post("/settings/reset")

export const getAiSuggestions = (category, type) =>
  api.post("/settings/suggest", { category, type })
