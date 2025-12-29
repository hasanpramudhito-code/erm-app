// SIMPLE EXPORT FUNCTION - TEST DULU SAJA!
const simpleExportRiskRegisterPDF = async (risks) => {
  console.log("🔥 SIMPLE EXPORT STARTED!");
  
  if (!risks || risks.length === 0) {
    console.error("❌ No risks to export");
    return;
  }

  console.log("📊 Risks data:", risks);

  // FORCE coordinate method
  const calculateSimpleScore = (impact, probability) => {
    const score = impact * probability;
    console.log(`🔢 ${impact}x${probability} = ${score}`);
    
    if (score >= 16) return "EKSTRIM";
    if (score >= 9) return "TINGGI";
    if (score >= 4) return "SEDANG";
    return "RENDAH";
  };

  // Cek data pertama
  const firstRisk = risks[0];
  console.log("🧪 Testing first risk:");
  console.log("Initial:", firstRisk.initialImpact, "x", firstRisk.initialProbability);
  console.log("Residual:", firstRisk.residualImpact, "x", firstRisk.residualProbability);

  // Test calculation
  const initialScore = calculateSimpleScore(
    firstRisk.initialImpact, 
    firstRisk.initialProbability
  );
  
  const residualScore = calculateSimpleScore(
    firstRisk.residualImpact, 
    firstRisk.residualProbability
  );

  console.log(`🎯 Initial Score: ${initialScore}`);
  console.log(`🎯 Residual Score: ${residualScore}`);

  // Buat dummy PDF content
  console.log("✅ Export test completed!");
  console.log("==========================");
  
  alert("Export test SUCCESS! Check console for details.");
};

// PAKAI DI COMPONENT ANDA:
const TestExportButton = () => {
  const testData = [
    {
      riskCode: "R-001",
      riskDescription: "Data breach akibat phishing",
      initialImpact: 4,
      initialProbability: 3,
      residualImpact: 2,
      residualProbability: 2,
      riskOwner: "IT Security"
    },
    {
      riskCode: "R-002",
      riskDescription: "Server downtime",
      initialImpact: 5,
      initialProbability: 2,
      residualImpact: 3,
      residualProbability: 1,
      riskOwner: "Infrastructure"
    }
  ];

  return (
    <button 
      onClick={() => simpleExportRiskRegisterPDF(testData)}
      style={{
        padding: "10px 20px",
        background: "#4CAF50",
        color: "white",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
        margin: "10px"
      }}
    >
      🧪 TEST SIMPLE EXPORT
    </button>
  );
};