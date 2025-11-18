// Basic integration test for group video call signaling
const io = require('socket.io-client');
const http = require('http');

// Test configuration
const SERVER_URL = 'http://localhost:3000';
const TEST_GROUP_ID = 'test-group';
const TEST_TIMEOUT = 10000;

// Test results
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log('✓', message);
    testsPassed++;
  } else {
    console.error('✗', message);
    testsFailed++;
  }
}

async function runTests() {
  console.log('Starting integration tests...\n');

  // Test 1: Server is running
  console.log('Test 1: Server connectivity');
  try {
    await new Promise((resolve, reject) => {
      http.get(SERVER_URL, (res) => {
        assert(res.statusCode === 200, 'Server responds with HTTP 200');
        resolve();
      }).on('error', reject);
    });
  } catch (err) {
    assert(false, 'Server responds with HTTP 200: ' + err.message);
  }

  // Test 2: Socket.IO connection
  console.log('\nTest 2: Socket.IO connection');
  const socket1 = io(SERVER_URL);
  
  await new Promise((resolve) => {
    socket1.on('connect', () => {
      assert(socket1.connected, 'Socket.IO client can connect');
      resolve();
    });
  });

  // Test 3: Start group call
  console.log('\nTest 3: Start group call');
  const userId1 = 'test-user-1';
  
  await new Promise((resolve) => {
    socket1.on('call-started', ({ sessionId, existingPeers }) => {
      assert(typeof sessionId === 'number', 'Call started with session ID');
      assert(Array.isArray(existingPeers), 'Existing peers list is returned');
      assert(existingPeers.length === 0, 'No existing peers for new call');
      resolve();
    });
    
    socket1.emit('start-group-call', { groupId: TEST_GROUP_ID, userId: userId1 });
  });

  // Test 4: Second user joins
  console.log('\nTest 4: Second user joins call');
  const socket2 = io(SERVER_URL);
  const userId2 = 'test-user-2';
  
  await new Promise((resolve) => {
    socket2.on('connect', () => {
      let receivedJoined = false;
      let receivedPeerJoined = false;

      socket2.on('call-joined', ({ sessionId, existingPeers }) => {
        assert(typeof sessionId === 'number', 'Second user receives session ID');
        assert(existingPeers.length === 1, 'Second user sees first user as existing peer');
        receivedJoined = true;
        if (receivedJoined && receivedPeerJoined) resolve();
      });

      socket1.on('peer-joined', ({ socketId, userId }) => {
        assert(socketId === socket2.id, 'First user notified of new peer');
        assert(userId === userId2, 'Peer user ID matches');
        receivedPeerJoined = true;
        if (receivedJoined && receivedPeerJoined) resolve();
      });

      socket2.emit('join-group-call', { groupId: TEST_GROUP_ID, userId: userId2 });
    });
  });

  // Test 5: Peer signaling (offer/answer/candidate)
  console.log('\nTest 5: Peer signaling');
  
  await new Promise((resolve) => {
    const testOffer = { type: 'offer', sdp: 'test-sdp' };
    const testAnswer = { type: 'answer', sdp: 'test-sdp-answer' };
    const testCandidate = { candidate: 'test-candidate' };

    let offerReceived = false;
    let answerReceived = false;
    let candidateReceived = false;

    socket2.on('peer-offer', ({ fromSocketId, offer }) => {
      assert(fromSocketId === socket1.id, 'Offer received from correct peer');
      assert(offer.type === 'offer', 'Offer has correct type');
      offerReceived = true;
      
      // Send answer back
      socket2.emit('peer-answer', { targetSocketId: fromSocketId, answer: testAnswer });
    });

    socket1.on('peer-answer', ({ fromSocketId, answer }) => {
      assert(fromSocketId === socket2.id, 'Answer received from correct peer');
      assert(answer.type === 'answer', 'Answer has correct type');
      answerReceived = true;
      
      // Send ICE candidate
      socket1.emit('peer-candidate', { targetSocketId: fromSocketId, candidate: testCandidate });
    });

    socket2.on('peer-candidate', ({ fromSocketId, candidate }) => {
      assert(fromSocketId === socket1.id, 'ICE candidate received from correct peer');
      assert(candidate.candidate === 'test-candidate', 'Candidate data is correct');
      candidateReceived = true;
      
      if (offerReceived && answerReceived && candidateReceived) {
        resolve();
      }
    });

    // Start signaling
    socket1.emit('peer-offer', { targetSocketId: socket2.id, offer: testOffer });
  });

  // Test 6: Leave call
  console.log('\nTest 6: Leave call');
  
  await new Promise((resolve) => {
    socket1.on('peer-left', ({ socketId }) => {
      assert(socketId === socket2.id, 'First user notified when peer leaves');
      resolve();
    });
    
    socket2.emit('leave-call', { groupId: TEST_GROUP_ID });
  });

  // Cleanup
  socket1.disconnect();
  socket2.disconnect();

  // Print results
  console.log('\n' + '='.repeat(50));
  console.log('Test Results:');
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log('='.repeat(50));

  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests with timeout
setTimeout(() => {
  console.error('\n✗ Tests timed out after', TEST_TIMEOUT, 'ms');
  process.exit(1);
}, TEST_TIMEOUT);

runTests().catch((err) => {
  console.error('\n✗ Test execution failed:', err);
  process.exit(1);
});
