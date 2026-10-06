import { useCallback, useEffect, useRef, useState } from 'react';
import socket from '../socket.js';

let toastCounter = 0;

export default function useRoom(roomId) {
  const [status, setStatus] = useState('joining');
  const [error, setError] = useState('');
  const [me, setMe] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [playback, setPlayback] = useState(null);
  const [requests, setRequests] = useState([]);
  const [messages, setMessages] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [reactions, setReactions] = useState([]);
  const meRef = useRef(null);

  const pushToast = useCallback((text, tone = 'info') => {
    toastCounter += 1;
    const id = toastCounter;
    setToasts((list) => [...list.slice(-3), { id, text, tone }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4000);
  }, []);

  useEffect(() => {
    const join = () => {
      socket.emit('join_room', { roomId }, (res) => {
        if (!res.ok) {
          setError(res.error);
          setStatus('error');
          return;
        }
        const snap = res.snapshot;
        meRef.current = snap.me.userId;
        setMe(snap.me.userId);
        setParticipants(snap.participants);
        setPlayback({ ...snap.playback, receivedAt: Date.now() });
        setRequests(snap.requests);
        setMessages(snap.messages);
        setStatus('joined');
      });
    };

    const onSync = (state) => {
      setPlayback({ ...state, receivedAt: Date.now() });
      if (state.by && state.action) {
        const labels = {
          play: 'played the video',
          pause: 'paused the video',
          seek: 'jumped to a new position',
          change_video: 'changed the video'
        };
        pushToast(`${state.by} ${labels[state.action]}`);
      }
    };

    const onUserJoined = (data) => {
      setParticipants(data.participants);
      pushToast(`${data.username} joined`);
    };

    const onUserLeft = (data) => {
      setParticipants(data.participants);
      pushToast(`${data.username} left`);
    };

    const onRoleAssigned = (data) => {
      setParticipants(data.participants);
      pushToast(`${data.username} is now ${data.role}`);
    };

    const onHostTransferred = (data) => {
      setParticipants(data.participants);
      pushToast(`${data.username} is now the host`);
    };

    const onRemoved = (data) => {
      if (data.userId === meRef.current) {
        setStatus('removed');
        return;
      }
      setParticipants(data.participants);
      pushToast(`${data.username} was removed`);
    };

    const onRequests = (data) => setRequests(data.requests);

    const onResolved = (data) => {
      const verb = data.approved ? 'approved' : 'rejected';
      if (data.userId === meRef.current) {
        pushToast(`${data.reviewer} ${verb} your ${data.action.replace('_', ' ')} request`, data.approved ? 'success' : 'error');
      }
    };

    const onReaction = (data) => {
      const reaction = { ...data, left: 8 + Math.random() * 80 };
      setReactions((list) => [...list.slice(-20), reaction]);
      setTimeout(() => setReactions((list) => list.filter((r) => r.id !== reaction.id)), 3000);
    };

    const onConnectError = (err) => {
      setError(err.message === 'unauthorized' ? 'Your session expired. Please log in again.' : 'Cannot reach the server');
      setStatus('error');
    };

    const onChat = (message) => setMessages((list) => [...list, message]);
    const onDenied = (data) => pushToast(data.reason, 'error');
    const onDisconnect = () => pushToast('Connection lost, reconnecting...', 'error');

    socket.on('connect', join);
    socket.on('sync_state', onSync);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('role_assigned', onRoleAssigned);
    socket.on('host_transferred', onHostTransferred);
    socket.on('participant_removed', onRemoved);
    socket.on('requests_updated', onRequests);
    socket.on('request_resolved', onResolved);
    socket.on('chat_message', onChat);
    socket.on('reaction', onReaction);
    socket.on('connect_error', onConnectError);
    socket.on('action_denied', onDenied);
    socket.on('disconnect', onDisconnect);

    socket.connect();

    return () => {
      socket.emit('leave_room');
      socket.off('connect', join);
      socket.off('sync_state', onSync);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('role_assigned', onRoleAssigned);
      socket.off('host_transferred', onHostTransferred);
      socket.off('participant_removed', onRemoved);
      socket.off('requests_updated', onRequests);
      socket.off('request_resolved', onResolved);
      socket.off('chat_message', onChat);
      socket.off('reaction', onReaction);
      socket.off('connect_error', onConnectError);
      socket.off('action_denied', onDenied);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
    };
  }, [roomId, pushToast]);

  const emit = useCallback((event, payload) => socket.emit(event, payload), []);

  const myRole = participants.find((p) => p.userId === me)?.role || 'participant';

  return { status, error, me, myRole, participants, playback, requests, messages, toasts, reactions, emit };
}
