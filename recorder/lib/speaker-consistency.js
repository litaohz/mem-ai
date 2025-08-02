/**
 * 说话人一致性映射模块 - 基于规则的最小改动方案
 * 使用简单、可靠的规则进行说话人ID映射
 */

/**
 * 基于规则的说话人映射
 * 规则1：时间连续性（3秒内认为是连续的）
 * 规则2：说话人数量一致性（相邻分包说话人数相同且≤2时按顺序映射）
 * 规则3：保守策略（不确定时创建新说话人ID）
 */
function mapSpeakerConsistency(chunkResults) {
  console.log('🎭 开始基于规则的说话人映射...');
  
  if (!chunkResults || chunkResults.length === 0) {
    return { mappedUtterances: [], globalSpeakers: [], mapping: {}, rules: [] };
  }
  
  // 1. 预处理分包数据，提取utterances并添加时间偏移
  const processedChunks = [];
  
  chunkResults.forEach((result, index) => {
    if (!result.success || !result.data?.result?.utterances) {
      return;
    }
    
    const utterances = result.data.result.utterances;
    const timeOffset = result.timeOffset || 0;
    
    const processedUtterances = utterances
      .filter(utterance => utterance.additions?.speaker)
      .map(utterance => ({
        ...utterance,
        originalSpeakerId: utterance.additions.speaker,
        adjustedStartTime: (utterance.start_time || 0) + (timeOffset * 1000),
        adjustedEndTime: (utterance.end_time || 0) + (timeOffset * 1000)
      }));
    
    if (processedUtterances.length > 0) {
      processedChunks.push({
        chunkIndex: index,
        utterances: processedUtterances
      });
    }
  });
  
  console.log(`📊 处理了 ${processedChunks.length} 个有效分包`);
  
  // 2. 构建基于规则的说话人映射
  const { speakerMapping, appliedRules } = buildRuleBasedMapping(processedChunks);
  
  // 3. 收集所有utterances并应用映射
  const mappedUtterances = [];
  processedChunks.forEach(chunk => {
    chunk.utterances.forEach(utterance => {
      const key = `${chunk.chunkIndex}_${utterance.originalSpeakerId}`;
      const globalSpeakerId = speakerMapping[key];
      
      mappedUtterances.push({
        ...utterance,
        chunkIndex: chunk.chunkIndex,
        additions: {
          ...utterance.additions,
          speaker: globalSpeakerId,
          originalSpeaker: utterance.originalSpeakerId,
          chunkIndex: chunk.chunkIndex
        },
        start_time: utterance.adjustedStartTime,
        end_time: utterance.adjustedEndTime
      });
    });
  });
  
  // 按时间排序
  mappedUtterances.sort((a, b) => a.adjustedStartTime - b.adjustedStartTime);
  
  // 4. 生成全局说话人列表
  const globalSpeakers = [...new Set(Object.values(speakerMapping))].sort();
  
  console.log(`✅ 基于规则的说话人映射完成:`);
  console.log(`   原始说话人标识: ${Object.keys(speakerMapping).length}`);
  console.log(`   全局说话人: ${globalSpeakers.length}`);
  console.log(`   应用规则: ${appliedRules.length} 条`);
  
  return {
    mappedUtterances,
    globalSpeakers,
    mapping: speakerMapping,
    rules: appliedRules,
    statistics: {
      totalUtterances: mappedUtterances.length,
      originalSpeakers: Object.keys(speakerMapping).length,
      globalSpeakers: globalSpeakers.length,
      rulesApplied: appliedRules.length
    }
  };
}

/**
 * 构建基于规则的说话人映射
 * 使用简单可靠的规则进行映射，保持透明性
 */
function buildRuleBasedMapping(chunkResults) {
  const speakerMapping = {};
  const appliedRules = [];
  let globalSpeakerCounter = 1;
  
  console.log('🎯 开始构建基于规则的说话人映射...');
  
  chunkResults.forEach((chunk, index) => {
    const chunkIndex = chunk.chunkIndex;
    console.log(`\n📦 处理分包 ${chunkIndex}:`);
    
    if (index === 0) {
      // 第一个分包：直接建立映射
      const speakers = [...new Set(chunk.utterances.map(u => u.originalSpeakerId))];
      speakers.forEach(speakerId => {
        const key = `${chunkIndex}_${speakerId}`;
        speakerMapping[key] = `speaker_${globalSpeakerCounter}`;
        console.log(`   🆕 初始映射: ${speakerId} -> speaker_${globalSpeakerCounter}`);
        globalSpeakerCounter++;
      });
      
      appliedRules.push({
        type: 'initial_mapping',
        chunk: chunkIndex,
        description: `初始分包，创建 ${speakers.length} 个说话人`,
        speakerCount: speakers.length
      });
    } else {
      // 后续分包：应用规则
      const previousChunk = chunkResults[index - 1];
      const ruleResult = applyMappingRules(
        previousChunk.utterances,
        chunk.utterances,
        speakerMapping,
        previousChunk.chunkIndex,
        chunkIndex
      );
      
      // 将应用的规则添加到总列表
      appliedRules.push(...ruleResult.appliedRules);
      
      // 为当前分包的所有说话人建立映射
      const currentSpeakers = [...new Set(chunk.utterances.map(u => u.originalSpeakerId))];
      currentSpeakers.forEach(speakerId => {
        const key = `${chunkIndex}_${speakerId}`;
        
        if (ruleResult.mapping[speakerId]) {
          // 使用规则映射的结果
          speakerMapping[key] = ruleResult.mapping[speakerId];
          console.log(`   🔗 映射: ${speakerId} -> ${ruleResult.mapping[speakerId]} (${ruleResult.rule})`);
        } else {
          // 创建新的说话人ID
          speakerMapping[key] = `speaker_${globalSpeakerCounter}`;
          console.log(`   🆕 新建: ${speakerId} -> speaker_${globalSpeakerCounter}`);
          globalSpeakerCounter++;
        }
      });
      
      const mappedCount = Object.keys(ruleResult.mapping).length;
      const newCount = currentSpeakers.length - mappedCount;
      
      console.log(`   📊 分包 ${chunkIndex} 统计: ${mappedCount} 个映射, ${newCount} 个新建`);
    }
  });
  
  console.log(`\n✅ 规则映射完成，共创建 ${globalSpeakerCounter - 1} 个全局说话人`);
  
  return {
    speakerMapping,
    appliedRules
  };
}

/**
 * 应用映射规则
 * 简单规则：如果上一个分包是说话人2最后说话，那么下一个分包还是说话人2
 */
function applyMappingRules(previousUtterances, currentUtterances, existingMapping, previousChunkIndex, currentChunkIndex) {
  const mapping = {};
  const appliedRules = [];
  
  // 获取前一个分包的最后一个utterance
  const lastUtterance = previousUtterances
    .sort((a, b) => a.adjustedStartTime - b.adjustedStartTime)
    .slice(-1)[0]; // 取最后一个
  
  // 获取当前分包的所有说话人
  const currentSpeakers = [...new Set(currentUtterances.map(u => u.originalSpeakerId))];
  
  console.log(`   🔍 应用简单规则: 上一个分包最后说话人=${lastUtterance?.originalSpeakerId}, 当前分包说话人=[${currentSpeakers.join(',')}]`);
  
  if (lastUtterance && currentSpeakers.length > 0) {
    // 获取上一个分包最后说话人的全局ID
    const lastSpeakerKey = `${previousChunkIndex}_${lastUtterance.originalSpeakerId}`;
    const lastGlobalSpeaker = existingMapping[lastSpeakerKey];
    
    console.log(`   📋 上一个分包最后说话人: ${lastUtterance.originalSpeakerId} -> ${lastGlobalSpeaker}`);
    
    if (lastGlobalSpeaker) {
      // 如果上一个分包最后说话的是说话人2，那么当前分包的第一个说话人也是说话人2
      if (lastGlobalSpeaker === 'speaker_2') {
        // 将当前分包的第一个说话人映射为说话人2
        mapping[currentSpeakers[0]] = 'speaker_2';
        console.log(`   ✅ 应用规则: ${currentSpeakers[0]} -> speaker_2 (上一个分包最后是说话人2)`);
        
        appliedRules.push({
          type: 'speaker2_continuity',
          chunk: currentChunkIndex,
          description: '上一个分包最后是说话人2，当前分包继续是说话人2',
          lastSpeaker: lastUtterance.originalSpeakerId,
          currentSpeaker: currentSpeakers[0]
        });
      } else {
        // 如果上一个分包最后说话的是说话人1，那么当前分包的第一个说话人也是说话人1
        mapping[currentSpeakers[0]] = lastGlobalSpeaker;
        console.log(`   ✅ 应用规则: ${currentSpeakers[0]} -> ${lastGlobalSpeaker} (延续上一个分包最后说话人)`);
        
        appliedRules.push({
          type: 'last_speaker_continuity',
          chunk: currentChunkIndex,
          description: `延续上一个分包最后说话人${lastGlobalSpeaker}`,
          lastSpeaker: lastUtterance.originalSpeakerId,
          currentSpeaker: currentSpeakers[0]
        });
      }
      
      // 如果当前分包有多个说话人，其他说话人按顺序映射
      if (currentSpeakers.length > 1) {
        for (let i = 1; i < currentSpeakers.length; i++) {
          const speakerNum = i + 1;
          const globalSpeaker = `speaker_${speakerNum}`;
          mapping[currentSpeakers[i]] = globalSpeaker;
          console.log(`   📝 额外映射: ${currentSpeakers[i]} -> ${globalSpeaker}`);
        }
      }
    }
  }
  
  // 如果没有应用任何规则，使用保守策略
  const unmappedSpeakers = currentSpeakers.filter(s => !mapping[s]);
  if (unmappedSpeakers.length > 0) {
    console.log(`   ⚠️  保守策略: ${unmappedSpeakers.length} 个说话人将创建新ID`);
    appliedRules.push({
      type: 'conservative_new',
      chunk: currentChunkIndex,
      description: `保守策略：为 ${unmappedSpeakers.length} 个不确定的说话人创建新ID`,
      newSpeakers: unmappedSpeakers.length
    });
  }
  
  const appliedRuleType = appliedRules.length > 0 ? 
    (appliedRules[0].type === 'speaker2_continuity' ? '说话人2延续' :
     appliedRules[0].type === 'last_speaker_continuity' ? '最后说话人延续' : '保守策略') : '无规则';
  
  return {
    mapping,
    appliedRules,
    rule: appliedRuleType
  };
}

/**
 * 生成说话人映射报告
 */
function generateMappingReport(mapping, chunkResults) {
  const report = {
    totalChunks: chunkResults.length,
    mappingDetails: {},
    globalSpeakers: [...new Set(Object.values(mapping))].sort(),
    inconsistencies: []
  };
  
  // 按分包组织映射信息
  Object.entries(mapping).forEach(([key, globalSpeaker]) => {
    const [chunkIndex, originalSpeaker] = key.split('_');
    
    if (!report.mappingDetails[chunkIndex]) {
      report.mappingDetails[chunkIndex] = {};
    }
    
    report.mappingDetails[chunkIndex][originalSpeaker] = globalSpeaker;
  });
  
  // 检测潜在的不一致性
  const speakerTransitions = {};
  Object.entries(mapping).forEach(([key, globalSpeaker]) => {
    if (!speakerTransitions[globalSpeaker]) {
      speakerTransitions[globalSpeaker] = [];
    }
    speakerTransitions[globalSpeaker].push(key);
  });
  
  // 标记可能的不一致性（同一全局说话人在多个分包中有不同的原始ID）
  Object.entries(speakerTransitions).forEach(([globalSpeaker, keys]) => {
    if (keys.length > 1) {
      const originalSpeakers = keys.map(k => k.split('_')[1]);
      const uniqueOriginals = [...new Set(originalSpeakers)];
      
      if (uniqueOriginals.length > 1) {
        report.inconsistencies.push({
          globalSpeaker,
          mappings: keys,
          originalSpeakers: uniqueOriginals
        });
      }
    }
  });
  
  return report;
}

module.exports = {
  mapSpeakerConsistency,
  generateMappingReport
};