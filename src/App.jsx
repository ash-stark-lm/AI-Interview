import React, { useState, useEffect, useRef } from 'react'
import * as monaco from 'monaco-editor'
import Vapi from '@vapi-ai/web'

const problemStatement = `
Problem Statement — Two Sum

Description:
Given an array of integers nums and an integer target, return the indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.

Example 1:
Input: nums = [2, 7, 11, 15], target = 9
Output: [0, 1]

Example 2:
Input: nums = [3, 2, 4], target = 6
Output: [1, 2]

Example 3:
Input: nums = [3, 3], target = 6
Output: [0, 1]

Constraints:
- 2 <= nums.length <= 10^4
- -1 <= nums[i] <= 10^9
- -1 <= target <= 10^9
- Exactly one valid answer exists
- Cannot use the same element twice
`

export default function InterviewPage() {
  const apiKey = import.meta.env.VITE_VAPI_API_KEY
  const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID

  const editorRef = useRef(null)
  const containerRef = useRef(null)
  const [vapi, setVapi] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [editorCode, setEditorCode] = useState(`\
vector<int> twoSum(vector<int>& nums, int target) {
    // Write your code here
    return {};
}
`)
  const [lastCodeUpdate, setLastCodeUpdate] = useState(Date.now())

  // Debounced function to send code updates
  const sendCodeUpdate = useRef(null)

  useEffect(() => {
    sendCodeUpdate.current = debounce((code) => {
      if (isConnected && vapi) {
        vapi.send({
          type: 'add-message',
          message: {
            role: 'user',
            content: `[CODE UPDATE] Current code in Monaco editor:\n\`\`\`cpp\n${code}\n\`\`\`\n\nPlease review my current progress on the Two Sum problem.`,
          },
        })

        vapi.send({
          type: 'context-update',
          payload: {
            question: problemStatement,
            code,
            language: 'cpp',
            timestamp: Date.now(),
          },
        })

        console.log('Sent code update to Vapi:', code.substring(0, 100) + '...')
      }
    }, 10000) // 10 second debounce
  }, [isConnected, vapi, problemStatement])

  useEffect(() => {
    if (containerRef.current) {
      editorRef.current = monaco.editor.create(containerRef.current, {
        value: editorCode,
        language: 'cpp',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
      })

      // Track code changes
      editorRef.current.onDidChangeModelContent(() => {
        const code = editorRef.current.getValue()
        setEditorCode(code)
        setLastCodeUpdate(Date.now())

        console.log('Editor changed, code length:', code.length)

        // Send debounced update
        if (sendCodeUpdate.current) {
          sendCodeUpdate.current(code)
        }
      })

      // Track cursor position changes (to detect if user is actively editing)
      editorRef.current.onDidChangeCursorPosition(() => {
        if (isConnected && vapi) {
          // Send a lightweight activity signal
          vapi.send({
            type: 'user-activity',
            payload: {
              type: 'cursor-move',
              timestamp: Date.now(),
            },
          })
        }
      })
    }

    return () => editorRef.current?.dispose()
  }, []) // Remove dependencies to avoid recreation

  // Initialize Vapi
  useEffect(() => {
    if (!apiKey || !assistantId) {
      console.error('VAPI env vars missing!')
      return
    }

    const vapiInstance = new Vapi(apiKey)
    setVapi(vapiInstance)

    vapiInstance.on('call-start', () => {
      console.log('Vapi call started')
      setIsConnected(true)

      // Send initial context with a delay to ensure connection is established
      setTimeout(() => {
        const code = editorRef.current?.getValue() || editorCode

        // Send initial message to establish context
        vapiInstance.send({
          type: 'add-message',
          message: {
            role: 'user',
            content: `Hi! I'm starting a technical interview for the Two Sum problem. Here's my initial code:\n\n\`\`\`cpp\n${code}\n\`\`\`\n\nI'm ready to begin the interview.`,
          },
        })

        // Also send context update
        vapiInstance.send({
          type: 'context-update',
          payload: {
            question: problemStatement,
            code,
            language: 'cpp',
            sessionStart: true,
          },
        })

        console.log('Initial context sent to Vapi')
      }, 500)
    })

    vapiInstance.on('call-end', () => {
      console.log('Vapi call ended')
      setIsConnected(false)
    })

    vapiInstance.on('error', (err) => {
      console.error('Vapi error:', err)
    })

    // Listen for assistant messages
    vapiInstance.on('message', (message) => {
      console.log('Assistant message:', message)
    })

    return () => vapiInstance?.stop()
  }, [apiKey, assistantId])

  const startCall = async () => {
    if (!vapi) return
    console.log('Starting Vapi call...')

    try {
      await vapi.start(assistantId, {
        metadata: {
          question: problemStatement,
          sessionType: 'technical-interview',
          language: 'cpp',
        },
      })
    } catch (error) {
      console.error('Failed to start Vapi call:', error)
    }
  }

  const endCall = () => {
    console.log('Ending Vapi call...')

    if (isConnected && vapi) {
      // Send end session message
      vapi.send({
        type: 'add-message',
        message: {
          role: 'user',
          content: 'END_SESSION — SHOW_SOLUTION',
        },
      })
    }

    vapi?.stop()
  }

  // Manual code share function
  const shareCurrentCode = () => {
    if (isConnected && vapi) {
      const code = editorRef.current?.getValue() || editorCode
      vapi.send({
        type: 'add-message',
        message: {
          role: 'user',
          content: `Please review my current code:\n\n\`\`\`cpp\n${code}\n\`\`\`\n\nWhat do you think about my approach?`,
        },
      })
    }
  }

  return (
    <div className="flex min-h-screen bg-[#1a1c1e] text-white font-sans px-4 sm:px-6 py-4 gap-6">
      {/* Left Panel: Problem */}
      <div className="flex-1 flex flex-col bg-[#1F2123] rounded-xl p-6 border border-[#2A2D2E] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Problem Statement</h2>
        <pre className="text-sm text-gray-300 whitespace-pre-wrap break-words">
          {problemStatement}
        </pre>

        {/* Status indicator */}
        <div className="mt-4 p-3 rounded-lg bg-[#2A2D2E] border border-[#3A3D3E]">
          <div className="flex items-center gap-2 text-sm">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-gray-500'
              }`}
            />
            <span>
              Interview Status: {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Last code update: {new Date(lastCodeUpdate).toLocaleTimeString()}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="mt-6 flex flex-col gap-3">
          <div className="flex gap-4">
            <button
              onClick={startCall}
              disabled={isConnected}
              className="flex-1 bg-[#0FA] text-black py-2 rounded-md font-semibold hover:bg-[#0FA]/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Interview
            </button>

            <button
              onClick={endCall}
              disabled={!isConnected}
              className="flex-1 bg-red-500 text-white py-2 rounded-md font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              End Interview
            </button>
          </div>

          <button
            onClick={shareCurrentCode}
            disabled={!isConnected}
            className="w-full bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Share Current Code
          </button>
        </div>
      </div>

      {/* Right Panel: Editor */}
      <div className="flex-1 relative bg-[#1F2123] rounded-xl border border-[#2A2D2E] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[#2A2D2E]">
          <h3 className="text-lg font-semibold">Code Editor (C++)</h3>
        </div>
        <div ref={containerRef} style={{ width: '100%', flexGrow: 1 }} />
      </div>
    </div>
  )
}

// Debounce utility function
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}
