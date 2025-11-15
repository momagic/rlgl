# World Chain Verification Levels Guide

## Overview

World Chain offers multiple verification levels to balance accessibility with security. The Red Light Green Light Game V3 contract supports all verification levels with tiered rewards to incentivize higher verification levels.

## World Chain Verification Levels

### 1. **Orb+ Verification (World ID Orb+)**
- **Description**: Highest level of human verification using World ID Orb+
- **Security Level**: Maximum
- **Use Case**: One account per human, maximum anti-bot protection
- **Reward Multiplier**: 150% (50% bonus)
- **Implementation**: `VerificationLevel.OrbPlus`

### 2. **Orb Verification (World ID Orb)**
- **Description**: Standard human verification using World ID Orb
- **Security Level**: Very High
- **Use Case**: One account per human, strong anti-bot protection
- **Reward Multiplier**: 130% (30% bonus)
- **Implementation**: `VerificationLevel.Orb`

### 3. **Secure Document Verification (World ID Secure Document)**
- **Description**: Secure document-based verification
- **Security Level**: High
- **Use Case**: Document-based identity verification
- **Reward Multiplier**: 120% (20% bonus)
- **Implementation**: `VerificationLevel.SecureDocument`

### 4. **Document Verification (World ID Document)**
- **Description**: Standard document-based verification
- **Security Level**: Medium-High
- **Use Case**: Basic document verification
- **Reward Multiplier**: 110% (10% bonus)
- **Implementation**: `VerificationLevel.Document`

### 5. **Device Verification (World ID Device)**
- **Description**: Proof of unique device using World ID Device
- **Security Level**: Medium
- **Use Case**: One account per device, easier onboarding
- **Reward Multiplier**: 105% (5% bonus)
- **Implementation**: `VerificationLevel.Device`

### 6. **No Verification**
- **Description**: Open access without verification
- **Security Level**: Lowest
- **Use Case**: Maximum accessibility, immediate play
- **Reward Multiplier**: 100% (no bonus)
- **Implementation**: `VerificationLevel.None`

## Verification System Architecture

### Contract Implementation

```solidity
enum VerificationLevel { None, Device, Document, SecureDocument, Orb, OrbPlus }

struct Player {
    // ... other fields ...
    VerificationLevel verificationLevel;
    bool isVerified;
}

// Verification multipliers
uint256 public orbPlusMultiplier = 150; // 150% (50% bonus)
uint256 public orbMultiplier = 130; // 130% (30% bonus)
uint256 public secureDocumentMultiplier = 120; // 120% (20% bonus)
uint256 public documentMultiplier = 110; // 110% (10% bonus)
uint256 public deviceMultiplier = 105; // 105% (5% bonus)
uint256 public unverifiedMultiplier = 100; // 100% (no bonus)
```

### Reward Calculation

```solidity
function _getVerificationMultiplier(address user) internal view returns (uint256) {
    Player memory player = players[user];
    
    if (!player.isVerified) {
        return unverifiedMultiplier; // 100%
    }
    
    if (player.verificationLevel == VerificationLevel.OrbPlus) {
        return orbPlusMultiplier; // 150%
    } else if (player.verificationLevel == VerificationLevel.Orb) {
        return orbMultiplier; // 130%
    } else if (player.verificationLevel == VerificationLevel.SecureDocument) {
        return secureDocumentMultiplier; // 120%
    } else if (player.verificationLevel == VerificationLevel.Document) {
        return documentMultiplier; // 110%
    } else if (player.verificationLevel == VerificationLevel.Device) {
        return deviceMultiplier; // 105%
    }
    
    return unverifiedMultiplier; // 100%
}
```

## Implementation Examples

### Frontend Integration

#### 1. **Orb+ Verification (World ID Orb+)**

```javascript
import { WorldIDWidget } from '@worldcoin/id'

// Initialize World ID Orb+
const worldID = new WorldIDWidget({
    app_id: 'app_YOUR_APP_ID',
    action: 'verify_orb_plus',
    signal: userAddress,
})

// Verify user with Orb+
const verifyOrbPlus = async () => {
    try {
        const result = await worldID.open()
        
        if (result.success) {
            // Call contract to set verification
            await v3Contract.setUserVerification(
                userAddress,
                5, // VerificationLevel.OrbPlus
                true
            )
            
            console.log('Orb+ verification successful!')
        }
    } catch (error) {
        console.error('Orb+ verification failed:', error)
    }
}
```

#### 2. **Orb Verification (World ID Orb)**

```javascript
import { WorldIDWidget } from '@worldcoin/id'

// Initialize World ID Orb
const worldID = new WorldIDWidget({
    app_id: 'app_YOUR_APP_ID',
    action: 'verify_orb',
    signal: userAddress,
})

// Verify user with Orb
const verifyOrb = async () => {
    try {
        const result = await worldID.open()
        
        if (result.success) {
            // Call contract to set verification
            await v3Contract.setUserVerification(
                userAddress,
                4, // VerificationLevel.Orb
                true
            )
            
            console.log('Orb verification successful!')
        }
    } catch (error) {
        console.error('Orb verification failed:', error)
    }
}
```

#### 3. **Secure Document Verification**

```javascript
import { WorldIDWidget } from '@worldcoin/id'

// Initialize World ID Secure Document
const worldID = new WorldIDWidget({
    app_id: 'app_YOUR_APP_ID',
    action: 'verify_secure_document',
    signal: userAddress,
})

// Verify with Secure Document
const verifySecureDocument = async () => {
    try {
        const result = await worldID.open()
        
        if (result.success) {
            // Call contract to set verification
            await v3Contract.setUserVerification(
                userAddress,
                3, // VerificationLevel.SecureDocument
                true
            )
            
            console.log('Secure Document verification successful!')
        }
    } catch (error) {
        console.error('Secure Document verification failed:', error)
    }
}
```

#### 4. **Document Verification**

```javascript
import { WorldIDWidget } from '@worldcoin/id'

// Initialize World ID Document
const worldID = new WorldIDWidget({
    app_id: 'app_YOUR_APP_ID',
    action: 'verify_document',
    signal: userAddress,
})

// Verify with Document
const verifyDocument = async () => {
    try {
        const result = await worldID.open()
        
        if (result.success) {
            // Call contract to set verification
            await v3Contract.setUserVerification(
                userAddress,
                2, // VerificationLevel.Document
                true
            )
            
            console.log('Document verification successful!')
        }
    } catch (error) {
        console.error('Document verification failed:', error)
    }
}
```

#### 5. **Device Verification (World ID Device)**

```javascript
import { WorldIDDevice } from '@worldcoin/id'

// Initialize World ID Device
const worldIDDevice = new WorldIDDevice({
    app_id: 'app_YOUR_APP_ID',
    action: 'verify_device',
    signal: userAddress,
})

// Verify device
const verifyDevice = async () => {
    try {
        const result = await worldIDDevice.verify()
        
        if (result.success) {
            // Call contract to set verification
            await v3Contract.setUserVerification(
                userAddress,
                1, // VerificationLevel.Device
                true
            )
            
            console.log('Device verification successful!')
        }
    } catch (error) {
        console.error('Device verification failed:', error)
    }
}
```

#### 6. **No Verification (Open Access)**

```javascript
// Allow immediate play without verification
const playWithoutVerification = async () => {
    try {
        // User can play immediately
        await v3Contract.startGame()
        console.log('Game started without verification!')
    } catch (error) {
        console.error('Game start failed:', error)
    }
}
```

### Contract Functions

#### **Set User Verification**
```solidity
function setUserVerification(
    address user,
    VerificationLevel verificationLevel,
    bool isVerified
) external onlyAuthorizedSubmitter
```

#### **Get User Verification Status**
```solidity
function getUserVerificationStatus(address user) external view returns (
    VerificationLevel verificationLevel,
    bool isVerified,
    uint256 multiplier
)
```

#### **Check Verification Types**
```solidity
function isUserOrbPlusVerified(address user) external view returns (bool)
function isUserOrbVerified(address user) external view returns (bool)
function isUserSecureDocumentVerified(address user) external view returns (bool)
function isUserDocumentVerified(address user) external view returns (bool)
function isUserDeviceVerified(address user) external view returns (bool)
```

#### **Get Verification Multipliers**
```solidity
function getVerificationMultipliers() external view returns (
    uint256 orbPlusMultiplier,
    uint256 orbMultiplier,
    uint256 secureDocumentMultiplier,
    uint256 documentMultiplier,
    uint256 deviceMultiplier,
    uint256 unverifiedMultiplier
)
```

## Reward Examples

### **Example 1: Orb+ Verified User**
- **Score**: 100 points
- **Base Reward**: 100 × 0.1 = 10 RLGL
- **Multiplier**: 150% (Orb+ verified)
- **Final Reward**: 10 × 1.5 = 15 RLGL

### **Example 2: Orb Verified User**
- **Score**: 100 points
- **Base Reward**: 100 × 0.1 = 10 RLGL
- **Multiplier**: 130% (Orb verified)
- **Final Reward**: 10 × 1.3 = 13 RLGL

### **Example 3: Secure Document Verified User**
- **Score**: 100 points
- **Base Reward**: 100 × 0.1 = 10 RLGL
- **Multiplier**: 120% (Secure Document verified)
- **Final Reward**: 10 × 1.2 = 12 RLGL

### **Example 4: Document Verified User**
- **Score**: 100 points
- **Base Reward**: 100 × 0.1 = 10 RLGL
- **Multiplier**: 110% (Document verified)
- **Final Reward**: 10 × 1.1 = 11 RLGL

### **Example 5: Device Verified User**
- **Score**: 100 points
- **Base Reward**: 100 × 0.1 = 10 RLGL
- **Multiplier**: 105% (Device verified)
- **Final Reward**: 10 × 1.05 = 10.5 RLGL

### **Example 6: Unverified User**
- **Score**: 100 points
- **Base Reward**: 100 × 0.1 = 10 RLGL
- **Multiplier**: 100% (No verification)
- **Final Reward**: 10 × 1.0 = 10 RLGL

## Admin Functions

### **Update Verification Multipliers**
```solidity
function updateVerificationMultipliers(
    uint256 newOrbPlusMultiplier,        // 100-300%
    uint256 newOrbMultiplier,            // 100-250%
    uint256 newSecureDocumentMultiplier, // 100-200%
    uint256 newDocumentMultiplier,       // 100-150%
    uint256 newDeviceMultiplier,         // 100-120%
    uint256 newUnverifiedMultiplier      // 50-100%
) external onlyOwner
```

### **Bounds and Validation**
- **Orb+ Multiplier**: 100-300% (1.0x - 3.0x)
- **Orb Multiplier**: 100-250% (1.0x - 2.5x)
- **Secure Document Multiplier**: 100-200% (1.0x - 2.0x)
- **Document Multiplier**: 100-150% (1.0x - 1.5x)
- **Device Multiplier**: 100-120% (1.0x - 1.2x)
- **Unverified Multiplier**: 50-100% (0.5x - 1.0x)
- **Hierarchy**: Orb+ ≥ Orb ≥ Secure Document ≥ Document ≥ Device ≥ Unverified

## Frontend UX Considerations

### **Verification Flow**

1. **Welcome Screen**
   - Explain verification benefits
   - Show reward multipliers for each level
   - Offer immediate play option

2. **Verification Options**
   - Orb+ verification (highest rewards - 50% bonus)
   - Orb verification (very high rewards - 30% bonus)
   - Secure Document verification (high rewards - 20% bonus)
   - Document verification (medium-high rewards - 10% bonus)
   - Device verification (medium rewards - 5% bonus)
   - Skip verification (basic rewards - no bonus)

3. **Progressive Enhancement**
   - Start with no verification
   - Encourage upgrade to device verification
   - Promote document verification
   - Highlight secure document benefits
   - Showcase Orb verification advantages
   - Emphasize Orb+ as the ultimate verification

### **UI Components**

```jsx
// Verification Status Component
const VerificationStatus = ({ userAddress }) => {
    const [verification, setVerification] = useState(null)
    
    useEffect(() => {
        const getStatus = async () => {
            const status = await v3Contract.getUserVerificationStatus(userAddress)
            setVerification(status)
        }
        getStatus()
    }, [userAddress])
    
    const getLevelName = (level) => {
        switch(level) {
            case 5: return 'Orb+'
            case 4: return 'Orb'
            case 3: return 'Secure Document'
            case 2: return 'Document'
            case 1: return 'Device'
            case 0: return 'None'
            default: return 'Unknown'
        }
    }
    
    return (
        <div className="verification-status">
            <h3>Verification Status</h3>
            <div className="status-info">
                <span>Level: {getLevelName(verification?.verificationLevel)}</span>
                <span>Verified: {verification?.isVerified ? 'Yes' : 'No'}</span>
                <span>Reward Multiplier: {verification?.multiplier}%</span>
            </div>
        </div>
    )
}

// Verification Options Component
const VerificationOptions = ({ onVerify }) => {
    return (
        <div className="verification-options">
            <h3>Choose Verification Level</h3>
            
            <div className="option orb-plus">
                <h4>Orb+ Verification</h4>
                <p>Maximum rewards (150% multiplier - 50% bonus)</p>
                <button onClick={() => onVerify('orb-plus')}>
                    Verify with Orb+
                </button>
            </div>
            
            <div className="option orb">
                <h4>Orb Verification</h4>
                <p>Very high rewards (130% multiplier - 30% bonus)</p>
                <button onClick={() => onVerify('orb')}>
                    Verify with Orb
                </button>
            </div>
            
            <div className="option secure-document">
                <h4>Secure Document Verification</h4>
                <p>High rewards (120% multiplier - 20% bonus)</p>
                <button onClick={() => onVerify('secure-document')}>
                    Verify with Secure Document
                </button>
            </div>
            
            <div className="option document">
                <h4>Document Verification</h4>
                <p>Medium-high rewards (110% multiplier - 10% bonus)</p>
                <button onClick={() => onVerify('document')}>
                    Verify with Document
                </button>
            </div>
            
            <div className="option device">
                <h4>Device Verification</h4>
                <p>Medium rewards (105% multiplier - 5% bonus)</p>
                <button onClick={() => onVerify('device')}>
                    Verify Device
                </button>
            </div>
            
            <div className="option none">
                <h4>No Verification</h4>
                <p>Basic rewards (100% multiplier - no bonus)</p>
                <button onClick={() => onVerify('none')}>
                    Play Without Verification
                </button>
            </div>
        </div>
    )
}
```

## Security Considerations

### **Verification Integrity**
- Only authorized submitters can set verification status
- Verification status is immutable once set
- Multiplier bounds prevent extreme values
- Hierarchy enforcement ensures logical progression

### **Anti-Abuse Measures**
- One verification per user address
- Verification level hierarchy enforced
- Owner can update multipliers if needed
- Bounds checking prevents manipulation

### **Privacy Protection**
- No personal data stored on-chain
- Only verification status and level tracked
- User controls their verification process
- Verification proofs handled off-chain

## Migration Strategy

### **From V1/V2 (Human-Only)**
1. **Maintain Compatibility**: Existing human-verified users keep their status
2. **Expand Options**: Add all new verification levels
3. **Gradual Transition**: Encourage but don't force verification upgrades
4. **Clear Communication**: Explain new verification hierarchy

### **Implementation Steps**
1. **Deploy V3 Contract**: With multi-level verification support
2. **Update Frontend**: Add verification level selection
3. **User Communication**: Explain new verification options and benefits
4. **Monitor Usage**: Track verification level adoption
5. **Optimize Multipliers**: Adjust based on user behavior

## Benefits of Multi-Level Verification

### **For Users**
- **Accessibility**: Immediate play without verification
- **Flexibility**: Choose verification level based on preference and comfort
- **Incentives**: Higher rewards for higher verification levels
- **Progressive**: Can upgrade verification level over time

### **For Platform**
- **User Growth**: Lower barrier to entry
- **Engagement**: Progressive verification encourages upgrades
- **Security**: Maintains anti-bot protection at higher levels
- **Revenue**: Higher verification levels may correlate with higher engagement

### **For World Chain**
- **Adoption**: Encourages World ID usage across all levels
- **Innovation**: Supports new verification methods
- **Ecosystem**: Contributes to World Chain growth
- **Data**: Provides insights into verification level preferences

---

## Conclusion

The multi-level verification system provides a comprehensive approach to accessibility and security, allowing users to choose their verification level while maintaining the integrity of the gaming experience. This system encourages World Chain adoption across all verification levels while providing immediate value to all users and clear incentives for higher verification levels.

## RPC Notes for Verification API

Verification endpoints in the backend rotate across multiple public World Chain RPCs to reduce rate limiting and transient failures.

- Files: `api/server.js`, `api/world-id.js`
- Default endpoints: `https://worldchain-mainnet.g.alchemy.com/public`, `https://480.rpc.thirdweb.com`, `https://worldchain-mainnet.gateway.tenderly.co`, `https://sparkling-autumn-dinghy.worldchain-mainnet.quiknode.pro`, `https://worldchain.drpc.org`
- Health checks: `getBlockNumber` with timeout before selecting an endpoint.
- Override: set `RPC_URL` to prefer a specific RPC first; rotation remains enabled.
