import api from "./client"

export const getLeads = (params = {}) =>
  api.get("/leads/", { params })

export const getStats = () =>
  api.get("/leads/stats")

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

export const triggerDailySummary = () =>
  api.post("/leads/notify/daily")
